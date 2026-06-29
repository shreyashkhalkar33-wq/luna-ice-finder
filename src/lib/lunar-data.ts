// Deterministic mocked lunar dataset for LunaVision mission planner.
// All numbers are simulated for the hackathon demo. Plug in real DFSAR/OHRC later.

export const GRID = 128; // cells per side
export const CRATER = {
  name: "Shackleton Crater",
  id: "PSR-S01",
  lat: -89.66,
  lon: 0.0,
  diameter_km: 21,
  depth_km: 4.2,
  region: "South Pole PSR",
};

// Mulberry32 PRNG so the same map is produced every render.
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Layered value noise.
function makeNoise(seed: number) {
  const r = rng(seed);
  const base = new Float32Array(GRID * GRID);
  for (let i = 0; i < base.length; i++) base[i] = r();
  const sample = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = base[((yi % GRID) + GRID) % GRID * GRID + ((xi % GRID) + GRID) % GRID];
    const b = base[((yi % GRID) + GRID) % GRID * GRID + (((xi + 1) % GRID) + GRID) % GRID];
    const c = base[(((yi + 1) % GRID) + GRID) % GRID * GRID + ((xi % GRID) + GRID) % GRID];
    const d = base[(((yi + 1) % GRID) + GRID) % GRID * GRID + (((xi + 1) % GRID) + GRID) % GRID];
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  return (x: number, y: number, octaves = 4) => {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += sample(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}

export type Grid = Float32Array;

export interface LunarDataset {
  dem: Grid;            // elevation (normalized 0..1, higher = higher)
  slope: Grid;          // 0..1
  roughness: Grid;      // 0..1
  illumination: Grid;   // 0..1 fraction of year sunlit
  backscatter: Grid;    // dB-ish normalized 0..1
  cpr: Grid;            // circular polarization ratio 0..~1.5, normalized 0..1
  dop: Grid;            // degree of polarization 0..1
  iceProbability: Grid; // 0..1
  hazard: Grid;         // 0..1
  boulderDensity: Grid; // 0..1
}

let cache: LunarDataset | null = null;

export function getDataset(): LunarDataset {
  if (cache) return cache;

  const elev = makeNoise(1337);
  const rough = makeNoise(7);
  const ice = makeNoise(42);
  const illum = makeNoise(99);

  const dem = new Float32Array(GRID * GRID);
  const slope = new Float32Array(GRID * GRID);
  const roughness = new Float32Array(GRID * GRID);
  const illumination = new Float32Array(GRID * GRID);
  const backscatter = new Float32Array(GRID * GRID);
  const cpr = new Float32Array(GRID * GRID);
  const dop = new Float32Array(GRID * GRID);
  const iceProbability = new Float32Array(GRID * GRID);
  const hazard = new Float32Array(GRID * GRID);
  const boulderDensity = new Float32Array(GRID * GRID);

  // Crater bowl shape — radial depression centered.
  const cx = GRID / 2;
  const cy = GRID / 2;
  const R = GRID * 0.42;

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const bowl = Math.min(1, d / R); // 0 at center, 1 at rim
      // Crater profile: deep floor, raised rim, gradual outside.
      const rim = Math.exp(-Math.pow((d - R) / (GRID * 0.05), 2));
      const floor = 1 - Math.exp(-Math.pow(d / (GRID * 0.28), 2));
      const baseElev = floor * 0.7 + rim * 0.35;
      const noise = elev(x / 12, y / 12, 5) * 0.25;
      dem[i] = Math.max(0, Math.min(1, baseElev + noise));

      const r = rough(x / 8, y / 8, 4);
      roughness[i] = r;

      // Slope: high near rim, scattered roughness everywhere.
      const slopeRim = Math.exp(-Math.pow((d - R) / (GRID * 0.04), 2));
      slope[i] = Math.min(1, slopeRim * 0.9 + r * 0.35);

      // Illumination: floor is permanently shadowed. Outer rim mostly lit.
      const lit = Math.max(0, (d - R * 0.85) / (GRID * 0.18));
      illumination[i] = Math.max(0, Math.min(1, lit * 0.9 + illum(x / 20, y / 20, 3) * 0.1));

      // Boulders concentrated near rim and rough zones.
      boulderDensity[i] = Math.min(1, slope[i] * 0.6 + r * 0.5 - 0.2);
      boulderDensity[i] = Math.max(0, boulderDensity[i]);

      // Backscatter: enhanced inside shadowed floor (proxy for ice/roughness).
      const shadowMask = 1 - illumination[i];
      backscatter[i] = Math.min(1, 0.25 + shadowMask * 0.4 + r * 0.35);

      // CPR: elevated in icy AND rough areas (ambiguity!) — model both.
      const iceField = ice(x / 18, y / 18, 5);
      const icyZone = shadowMask * (0.4 + iceField * 0.8);
      cpr[i] = Math.min(1, 0.2 + icyZone * 0.55 + r * 0.35);

      // DOP: lower for coherent ice scatter, higher for diffuse rocks.
      dop[i] = Math.max(0, Math.min(1, 0.85 - icyZone * 0.55 + (r - 0.5) * 0.25));

      // Ice probability = high CPR + low DOP + permanent shadow − roughness penalty.
      const lowDop = 1 - dop[i];
      const ip = cpr[i] * 0.45 + lowDop * 0.3 + shadowMask * 0.35 - r * 0.25;
      iceProbability[i] = Math.max(0, Math.min(1, ip));

      // Hazard combines slope + boulders + extreme roughness.
      hazard[i] = Math.max(0, Math.min(1, slope[i] * 0.55 + boulderDensity[i] * 0.45));
    }
  }

  cache = {
    dem, slope, roughness, illumination,
    backscatter, cpr, dop, iceProbability,
    hazard, boulderDensity,
  };
  return cache;
}

// --- Landing site candidates ---
export interface LandingSite {
  id: string;
  name: string;
  x: number; // grid coords
  y: number;
  score: number;
  safety: number;
  iceProximity: number;
  illumination: number;
  comms: number;
  rationale: string;
}

let sitesCache: LandingSite[] | null = null;
export function getLandingSites(): LandingSite[] {
  if (sitesCache) return sitesCache;
  const d = getDataset();
  // Scan grid for low-hazard, near-ice, sunlit cells.
  const candidates: LandingSite[] = [];
  for (let y = 8; y < GRID - 8; y += 4) {
    for (let x = 8; x < GRID - 8; x += 4) {
      const i = y * GRID + x;
      // Average ice in nearby radius.
      let iceNear = 0;
      let n = 0;
      for (let dy = -6; dy <= 6; dy += 2) {
        for (let dx = -6; dx <= 6; dx += 2) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
          iceNear += d.iceProbability[yy * GRID + xx];
          n++;
        }
      }
      iceNear /= n;
      const safety = 1 - d.hazard[i];
      const illum = d.illumination[i];
      const comms = Math.max(0, Math.min(1, d.dem[i] * 0.8 + 0.2));
      if (safety < 0.55 || illum < 0.3) continue;
      const score = safety * 0.4 + iceNear * 0.3 + illum * 0.2 + comms * 0.1;
      candidates.push({
        id: `LS-${x}-${y}`,
        name: "",
        x, y, score,
        safety,
        iceProximity: iceNear,
        illumination: illum,
        comms,
        rationale: "",
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  // De-dup spatially.
  const picked: LandingSite[] = [];
  for (const c of candidates) {
    if (picked.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < 14)) continue;
    picked.push(c);
    if (picked.length >= 5) break;
  }
  picked.forEach((s, idx) => {
    s.id = `LS-0${idx + 1}`;
    s.name = `Candidate ${String.fromCharCode(65 + idx)}`;
    s.rationale = [
      s.safety > 0.8 ? "Low slope plateau" : "Moderate terrain",
      s.iceProximity > 0.55 ? "Adjacent to high-prob ice" : "Ice within 2 km traverse",
      s.illumination > 0.7 ? "Quasi-continuous solar exposure" : "Periodic illumination window",
    ].join(" · ");
  });
  sitesCache = picked;
  return picked;
}

// --- Rover traverse: simple A* on hazard cost ---
export interface TraversePoint { x: number; y: number; }
export interface Traverse {
  path: TraversePoint[];
  distance_km: number;
  duration_h: number;
  energy_kwh: number;
  maxSlope: number;
  hazardExposure: number;
}

const HAZARD_THRESHOLD = 0.72;

export function planTraverse(
  start: TraversePoint,
  end: TraversePoint,
  d = getDataset(),
): Traverse {
  const cost = (i: number) => 1 + d.hazard[i] * 8 + d.slope[i] * 4;
  const passable = (i: number) => d.hazard[i] < HAZARD_THRESHOLD;
  const idx = (x: number, y: number) => y * GRID + x;
  const h = (x: number, y: number) => Math.hypot(x - end.x, y - end.y);

  const open = new Map<number, { f: number; g: number; x: number; y: number; parent: number }>();
  const closed = new Set<number>();
  const startIdx = idx(start.x, start.y);
  open.set(startIdx, { f: h(start.x, start.y), g: 0, x: start.x, y: start.y, parent: -1 });
  const parents = new Map<number, number>();

  while (open.size) {
    let bestKey = -1;
    let bestF = Infinity;
    for (const [k, v] of open) if (v.f < bestF) { bestF = v.f; bestKey = k; }
    if (bestKey < 0) break;
    const cur = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);
    if (cur.x === end.x && cur.y === end.y) {
      // reconstruct
      const path: TraversePoint[] = [];
      let k = bestKey;
      while (k !== -1) {
        path.push({ x: k % GRID, y: Math.floor(k / GRID) });
        k = parents.get(k) ?? -1;
      }
      path.reverse();
      return summarize(path, d);
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const ni = idx(nx, ny);
        if (closed.has(ni) || !passable(ni)) continue;
        const step = (dx && dy ? 1.414 : 1) * cost(ni);
        const g = cur.g + step;
        const existing = open.get(ni);
        if (existing && existing.g <= g) continue;
        parents.set(ni, bestKey);
        open.set(ni, { g, f: g + h(nx, ny) * 1.1, x: nx, y: ny, parent: bestKey });
      }
    }
    if (closed.size > 20000) break;
  }
  // Fallback: straight line.
  const path: TraversePoint[] = [];
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y));
  for (let i = 0; i <= steps; i++) {
    path.push({
      x: Math.round(start.x + ((end.x - start.x) * i) / steps),
      y: Math.round(start.y + ((end.y - start.y) * i) / steps),
    });
  }
  return summarize(path, d);
}

function summarize(path: TraversePoint[], d: LunarDataset): Traverse {
  // Approx: 1 cell ≈ 80 m on the demo grid.
  const CELL_M = 80;
  let dist_m = 0;
  let maxSlope = 0;
  let hazardExp = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    dist_m += Math.hypot(b.x - a.x, b.y - a.y) * CELL_M;
    const bi = b.y * GRID + b.x;
    maxSlope = Math.max(maxSlope, d.slope[bi]);
    hazardExp += d.hazard[bi];
  }
  const distance_km = dist_m / 1000;
  const ROVER_KMH = 0.08; // ~80 m/h conservative PSR pace
  const duration_h = distance_km / ROVER_KMH;
  const energy_kwh = distance_km * 0.45 + maxSlope * 2;
  return {
    path,
    distance_km,
    duration_h,
    energy_kwh,
    maxSlope,
    hazardExposure: hazardExp / Math.max(1, path.length),
  };
}

export function estimateIceVolume(threshold = 0.55) {
  const d = getDataset();
  const CELL_M = 80;
  const CELL_AREA = CELL_M * CELL_M; // m²
  let cells = 0;
  let probSum = 0;
  for (let i = 0; i < d.iceProbability.length; i++) {
    if (d.iceProbability[i] >= threshold) {
      cells++;
      probSum += d.iceProbability[i];
    }
  }
  const area_m2 = cells * CELL_AREA;
  const area_km2 = area_m2 / 1e6;
  // Assume mean detection depth 1.8 m and ice concentration scaled by mean prob.
  const meanProb = cells ? probSum / cells : 0;
  const depth_m = 1.8;
  const concentration = meanProb * 0.18; // 0..~18% ice by volume
  const volume_m3 = area_m2 * depth_m * concentration;
  const mass_t = volume_m3 * 0.917; // ice density ~0.917 t/m³
  // Confidence interval ±30% based on radar ambiguity.
  return {
    threshold,
    area_km2,
    depth_m,
    concentration,
    meanProb,
    volume_m3,
    mass_t,
    ci_low_t: mass_t * 0.7,
    ci_high_t: mass_t * 1.3,
    cells,
  };
}

export function gridStats(g: Grid) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < g.length; i++) {
    const v = g[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, mean: sum / g.length };
}
