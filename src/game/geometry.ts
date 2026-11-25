// The arithmetic of shapes on the ground, apart from the hunt so that the
// bot, which the hunt uses as each partner's brain, can share it without
// the two asking for each other.

const TAU = Math.PI * 2;

/** What `inside` needs of a tell: its kind, where it is, which way it points and how big it is. */
export interface Shape {
  kind: 'line' | 'cone' | 'ring';
  x: number;
  y: number;
  angle: number;
  len: number;
  w: number;
  r: number;
  half: number;
  inner: number;
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** The smallest turn from one heading to another. */
export function turn(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** True if a point is inside a shape. `pad` widens the shape: a big thing is struck by its rim. */
export function inside(tell: Shape, px: number, py: number, pad = 0): boolean {
  const dx = px - tell.x;
  const dy = py - tell.y;
  if (tell.kind === 'ring') {
    const d = Math.hypot(dx, dy);
    return d <= tell.r + pad && d >= tell.inner - pad;
  }
  if (tell.kind === 'cone') {
    const d = Math.hypot(dx, dy);
    if (d > tell.r + pad) return false;
    return d < 1 || Math.abs(turn(tell.angle, Math.atan2(dy, dx))) <= tell.half + (pad > 0 ? pad / Math.max(40, d) : 0);
  }
  const along = dx * Math.cos(tell.angle) + dy * Math.sin(tell.angle);
  const across = -dx * Math.sin(tell.angle) + dy * Math.cos(tell.angle);
  return along >= -pad && along <= tell.len + pad && Math.abs(across) <= tell.w / 2 + pad;
}
