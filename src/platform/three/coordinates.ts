import { Vector3 } from 'three';
import type { Position, Direction } from '@core/index';

export const CELL = 1.65;
export function cellWorld(p: Position, height = 0): Vector3 {
  return new Vector3(p.x * CELL, height, -p.y * CELL);
}
export function worldCell(point: Vector3): Position {
  return { x: Math.round(point.x / CELL) || 0, y: Math.round(-point.z / CELL) || 0 };
}
export const facingAngle: Record<Direction, number> = {
  up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2,
};
export function angleTo(from: Vector3, to: Vector3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Fit all board corners in a perspective frustum, including tall character silhouettes. */
export function boardFitDistance(width: number, height: number, aspect: number, fov: number, direction: Vector3): number {
  const forward = direction.clone().normalize();
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), forward).normalize();
  const up = new Vector3().crossVectors(forward, right).normalize();
  const tanV = Math.tan(fov * Math.PI / 360);
  const tanH = tanV * aspect;
  let distance = 0;
  for (const x of [-width * CELL / 2, width * CELL / 2]) {
    for (const z of [-height * CELL / 2, height * CELL / 2]) {
      for (const y of [-1.1, 3.3]) {
        const point = new Vector3(x, y, z);
        distance = Math.max(distance, point.dot(forward) + Math.max(Math.abs(point.dot(right)) / tanH, Math.abs(point.dot(up)) / tanV));
      }
    }
  }
  return distance * 1.14;
}
