#!/usr/bin/env python3
"""Fetch pinned CC0 art and retain the skeletal clips used by the Three.js adapter.
Run with python3 scripts/prepare-three-assets.py. No Blender or external service required.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import struct
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'src/platform/three/assets'
REPOS = {
    'characters': ('KayKit-Character-Pack-Adventures-1.0', '672074b73ba276876a19e8816ecdc5241817ab47'),
    'environment': ('KayKit-Dungeon-Remastered-1.0', 'b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07'),
}
CLIPS = {
    'Idle', 'Walking_A', 'Spellcast_Shoot', 'Spellcast_Raise', 'Hit_A', 'Hit_B',
    'Death_A', 'Block_Hit', '2H_Ranged_Shoot', '1H_Melee_Attack_Slice_Horizontal',
    '2H_Melee_Attack_Stab', '2H_Melee_Attack_Spin',
}
PROPS = ['floor_tile_small', 'floor_tile_small_broken_A', 'floor_tile_small_weeds_A',
         'pillar_decorated', 'wall_half', 'wall_broken', 'barrel_large', 'rubble_large',
         'torch_mounted', 'banner_red', 'banner_blue', 'floor_tile_big_spikes']


def compact_glb(raw):
    """Losslessly keep used clips and compact their referenced accessor/buffer data."""
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + size])
    binary = raw[28 + size:]
    doc['animations'] = [clip for clip in doc['animations'] if clip['name'] in CLIPS]
    assert {clip['name'] for clip in doc['animations']} == CLIPS
    used = set()
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            used.update(primitive['attributes'].values())
            if 'indices' in primitive:
                used.add(primitive['indices'])
            for target in primitive.get('targets', []):
                used.update(target.values())
    used.update(skin['inverseBindMatrices'] for skin in doc['skins'] if 'inverseBindMatrices' in skin)
    for clip in doc['animations']:
        for sampler in clip['samplers']:
            used.update((sampler['input'], sampler['output']))
    accessor_map = {old: new for new, old in enumerate(sorted(used))}
    doc['accessors'] = [doc['accessors'][old] for old in sorted(used)]
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            primitive['attributes'] = {k: accessor_map[v] for k, v in primitive['attributes'].items()}
            if 'indices' in primitive:
                primitive['indices'] = accessor_map[primitive['indices']]
            for target in primitive.get('targets', []):
                for k, v in target.items():
                    target[k] = accessor_map[v]
    for skin in doc['skins']:
        if 'inverseBindMatrices' in skin:
            skin['inverseBindMatrices'] = accessor_map[skin['inverseBindMatrices']]
    for clip in doc['animations']:
        for sampler in clip['samplers']:
            sampler['input'] = accessor_map[sampler['input']]
            sampler['output'] = accessor_map[sampler['output']]
    references = []
    def collect(value):
        if isinstance(value, dict):
            if 'bufferView' in value:
                references.append(value)
            for child in value.values():
                collect(child)
        elif isinstance(value, list):
            for child in value:
                collect(child)
    collect(doc['accessors'])
    collect(doc.get('images', []))
    views = sorted({obj['bufferView'] for obj in references})
    view_map = {old: new for new, old in enumerate(views)}
    buffer = bytearray()
    new_views = []
    for old in views:
        view = doc['bufferViews'][old].copy()
        buffer.extend(b'\0' * ((-len(buffer)) % 4))
        start = view.get('byteOffset', 0)
        data = binary[start:start + view['byteLength']]
        assert len(data) == view['byteLength']
        view['byteOffset'] = len(buffer)
        buffer.extend(data)
        new_views.append(view)
    for obj in references:
        obj['bufferView'] = view_map[obj['bufferView']]
    doc['bufferViews'] = new_views
    doc['buffers'] = [{'byteLength': len(buffer)}]
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    buffer.extend(b'\0' * ((-len(buffer)) % 4))
    total = 12 + 8 + len(encoded) + 8 + len(buffer)
    return struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + struct.pack('<II', len(buffer), 0x004E4942) + buffer


def fetch(job):
    kind, remote, local = job
    repo, revision = REPOS[kind]
    url = f'https://raw.githubusercontent.com/KayKit-Game-Assets/{repo}/{revision}/{remote}'
    raw = urllib.request.urlopen(url, timeout=90).read()
    output = compact_glb(raw) if local.startswith('models/') else raw
    path = ROOT / local
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(output)
    print(f'{local}: {len(raw):,} → {len(output):,} bytes')
    return {'file': local, 'creator': 'Kay Lousberg', 'license': 'CC0-1.0', 'source': url,
            'sourceSha256': hashlib.sha256(raw).hexdigest(), 'sha256': hashlib.sha256(output).hexdigest(),
            'processing': 'Retain 12 authored skeletal clips; losslessly compact accessors/bufferViews.' if local.startswith('models/') else 'Unmodified upstream file.'}


def main():
    jobs = [('characters', f'addons/kaykit_character_pack_adventures/Characters/gltf/{name}.glb', f'models/{name}.glb')
            for name in ['Knight', 'Mage', 'Rogue_Hooded', 'Barbarian']]
    for name in PROPS:
        suffix = '.glb' if name == 'floor_tile_big_spikes' else '.gltf.glb'
        jobs.append(('environment', f'addons/kaykit_dungeon_remastered/Assets/gltf/{name}{suffix}', f'environment/{name}.glb'))
    jobs += [('characters', 'LICENSE.txt', 'licenses/KayKit-Adventurers.txt'), ('environment', 'LICENSE.txt', 'licenses/KayKit-Dungeon.txt')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        provenance = list(pool.map(fetch, jobs))
    (ROOT / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
