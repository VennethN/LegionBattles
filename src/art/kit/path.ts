// A path made only of absolute M, L, Q, C and Z, so that it can be rotated,
// mirrored and moved by plain arithmetic and written out as numbers Inkscape
// shows as they are. There are no arcs: a circle is four curves.

export type Pt = readonly [number, number];
/** A point of a smooth outline. 'c' makes it a sharp corner. */
export type SmoothPt = readonly [number, number] | readonly [number, number, 'c'];

type Seg =
  | { k: 'M' | 'L'; p: number[] }
  | { k: 'Q'; p: number[] }
  | { k: 'C'; p: number[] }
  | { k: 'Z'; p: number[] };

const KAPPA = 0.5522847498;

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
}

export class Path {
  private segs: Seg[] = [];

  M(x: number, y: number): this {
    this.segs.push({ k: 'M', p: [x, y] });
    return this;
  }
  L(x: number, y: number): this {
    this.segs.push({ k: 'L', p: [x, y] });
    return this;
  }
  Q(x1: number, y1: number, x: number, y: number): this {
    this.segs.push({ k: 'Q', p: [x1, y1, x, y] });
    return this;
  }
  C(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    this.segs.push({ k: 'C', p: [x1, y1, x2, y2, x, y] });
    return this;
  }
  Z(): this {
    this.segs.push({ k: 'Z', p: [] });
    return this;
  }

  /** Appends another path's segments (for shapes with holes or many pieces). */
  add(other: Path): this {
    for (const s of other.segs) this.segs.push({ k: s.k, p: s.p.slice() } as Seg);
    return this;
  }

  map(fn: (x: number, y: number) => Pt): Path {
    const out = new Path();
    for (const s of this.segs) {
      const p: number[] = [];
      for (let i = 0; i < s.p.length; i += 2) {
        const [x, y] = fn(s.p[i], s.p[i + 1]);
        p.push(x, y);
      }
      out.segs.push({ k: s.k, p } as Seg);
    }
    return out;
  }

  translate(dx: number, dy: number): Path {
    return this.map((x, y) => [x + dx, y + dy]);
  }

  /** Degrees, clockwise on screen, about (cx, cy). */
  rotate(deg: number, cx = 0, cy = 0): Path {
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return this.map((x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      return [cx + dx * c - dy * s, cy + dx * s + dy * c];
    });
  }

  scale(sx: number, sy = sx, cx = 0, cy = 0): Path {
    return this.map((x, y) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
  }

  mirrorX(cx = 0): Path {
    return this.map((x, y) => [2 * cx - x, y]);
  }

  /** Corner to corner of all its points (control points too, so a little generous). */
  bounds(): { x: number; y: number; w: number; h: number } {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const s of this.segs) {
      for (let i = 0; i < s.p.length; i += 2) {
        x0 = Math.min(x0, s.p[i]);
        x1 = Math.max(x1, s.p[i]);
        y0 = Math.min(y0, s.p[i + 1]);
        y1 = Math.max(y1, s.p[i + 1]);
      }
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  toString(): string {
    return this.segs.map((s) => (s.k === 'Z' ? 'Z' : `${s.k} ${s.p.map(fmt).join(' ')}`)).join(' ');
  }
}

export function path(): Path {
  return new Path();
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): Path {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return new Path()
    .M(cx + rx, cy)
    .C(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry)
    .C(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy)
    .C(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry)
    .C(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy)
    .Z();
}

export function circle(cx: number, cy: number, r: number): Path {
  return ellipse(cx, cy, r, r);
}

/** A rectangle with round corners. `r` is one radius or [tl, tr, br, bl]. */
export function roundRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | readonly [number, number, number, number] = 0,
): Path {
  const m = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = (typeof r === 'number' ? [r, r, r, r] : r).map((v) => Math.min(v, m));
  const p = new Path().M(x + tl, y).L(x + w - tr, y);
  if (tr > 0) p.Q(x + w, y, x + w, y + tr);
  p.L(x + w, y + h - br);
  if (br > 0) p.Q(x + w, y + h, x + w - br, y + h);
  p.L(x + bl, y + h);
  if (bl > 0) p.Q(x, y + h, x, y + h - bl);
  p.L(x, y + tl);
  if (tl > 0) p.Q(x, y, x + tl, y);
  return p.Z();
}

export function poly(points: readonly Pt[], closed = true): Path {
  const p = new Path();
  points.forEach(([x, y], i) => (i === 0 ? p.M(x, y) : p.L(x, y)));
  return closed ? p.Z() : p;
}

export function line(x1: number, y1: number, x2: number, y2: number): Path {
  return new Path().M(x1, y1).L(x2, y2);
}

/**
 * A soft outline through the given points (a Catmull-Rom spline as curves).
 * This is how most organic shapes in the kit are drawn: a handful of points
 * and the curve finds its own way round them. A point marked 'c' is a corner.
 */
export function smooth(points: readonly SmoothPt[], closed = true, tension = 1): Path {
  const n = points.length;
  const p = new Path();
  if (n === 0) return p;
  const at = (i: number): SmoothPt => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  p.M(points[0][0], points[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    const c1x = p1[2] ? p1[0] : p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[2] ? p1[1] : p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[2] ? p2[0] : p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[2] ? p2[1] : p2[1] - (p3[1] - p1[1]) * k;
    if (p1[2] && p2[2]) p.L(p2[0], p2[1]);
    else p.C(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  return closed ? p.Z() : p;
}

/** A sausage from one point to another, with round ends. */
export function capsule(x1: number, y1: number, x2: number, y2: number, width: number): Path {
  const r = width / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * r;
  const ny = ux * r;
  const k = KAPPA * r;
  return new Path()
    .M(x1 + nx, y1 + ny)
    .L(x2 + nx, y2 + ny)
    .C(x2 + nx + ux * k, y2 + ny + uy * k, x2 + ux * r + nx * KAPPA, y2 + uy * r + ny * KAPPA, x2 + ux * r, y2 + uy * r)
    .C(x2 + ux * r - nx * KAPPA, y2 + uy * r - ny * KAPPA, x2 - nx + ux * k, y2 - ny + uy * k, x2 - nx, y2 - ny)
    .L(x1 - nx, y1 - ny)
    .C(x1 - nx - ux * k, y1 - ny - uy * k, x1 - ux * r - nx * KAPPA, y1 - uy * r - ny * KAPPA, x1 - ux * r, y1 - uy * r)
    .C(x1 - ux * r + nx * KAPPA, y1 - uy * r + ny * KAPPA, x1 + nx - ux * k, y1 + ny - uy * k, x1 + nx, y1 + ny)
    .Z();
}

/** A star or burst: `n` points, alternating between two radii. */
export function star(cx: number, cy: number, n: number, outer: number, inner: number, turn = -90): Path {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((turn + (i * 180) / n) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts);
}
