import { useEffect, useRef } from "react";
import { GRID, type Grid } from "@/lib/lunar-data";

type RGB = [number, number, number];

// Colormap presets — return [r,g,b] given t in 0..1.
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mix(stops: { t: number; c: RGB }[], t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].t) {
      const a = stops[i - 1];
      const b = stops[i];
      const u = (t - a.t) / (b.t - a.t || 1);
      return [lerp(a.c[0], b.c[0], u), lerp(a.c[1], b.c[1], u), lerp(a.c[2], b.c[2], u)];
    }
  }
  return stops[stops.length - 1].c;
}

export const COLORMAPS = {
  dem: (t: number) => mix([
    { t: 0, c: [22, 24, 32] },
    { t: 0.4, c: [70, 65, 60] },
    { t: 0.75, c: [150, 140, 120] },
    { t: 1, c: [230, 220, 200] },
  ], t),
  ice: (t: number) => mix([
    { t: 0, c: [10, 14, 24] },
    { t: 0.3, c: [10, 60, 90] },
    { t: 0.55, c: [40, 160, 200] },
    { t: 0.78, c: [120, 220, 235] },
    { t: 1, c: [255, 255, 255] },
  ], t),
  hazard: (t: number) => mix([
    { t: 0, c: [12, 30, 22] },
    { t: 0.4, c: [80, 120, 60] },
    { t: 0.7, c: [220, 170, 60] },
    { t: 1, c: [220, 70, 50] },
  ], t),
  cpr: (t: number) => mix([
    { t: 0, c: [12, 16, 28] },
    { t: 0.5, c: [80, 60, 130] },
    { t: 0.8, c: [220, 130, 240] },
    { t: 1, c: [255, 240, 255] },
  ], t),
  dop: (t: number) => mix([
    { t: 0, c: [10, 26, 32] },
    { t: 0.5, c: [60, 140, 130] },
    { t: 1, c: [220, 240, 200] },
  ], t),
  illumination: (t: number) => mix([
    { t: 0, c: [8, 10, 18] },
    { t: 0.4, c: [60, 60, 90] },
    { t: 1, c: [255, 230, 160] },
  ], t),
  slope: (t: number) => mix([
    { t: 0, c: [20, 24, 30] },
    { t: 0.5, c: [100, 110, 130] },
    { t: 1, c: [240, 100, 80] },
  ], t),
  backscatter: (t: number) => mix([
    { t: 0, c: [10, 12, 16] },
    { t: 1, c: [240, 240, 240] },
  ], t),
};

export type ColormapKey = keyof typeof COLORMAPS;

export interface MapLayer {
  data: Grid;
  colormap: ColormapKey;
  opacity?: number;
  threshold?: number; // hide values below
}

interface Props {
  base: MapLayer;
  overlays?: MapLayer[];
  sites?: { x: number; y: number; label: string; active?: boolean }[];
  path?: { x: number; y: number }[];
  target?: { x: number; y: number };
  showGrid?: boolean;
  className?: string;
  onPick?: (x: number, y: number) => void;
}

export function MapCanvas({
  base, overlays = [], sites = [], path, target, showGrid = true, className, onPick,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.min(cv.clientWidth, cv.clientHeight);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    // Render base + overlays into an offscreen pixel buffer at GRID resolution.
    const off = document.createElement("canvas");
    off.width = GRID;
    off.height = GRID;
    const ox = off.getContext("2d")!;
    const img = ox.createImageData(GRID, GRID);

    const baseCmap = COLORMAPS[base.colormap];
    for (let i = 0; i < base.data.length; i++) {
      const c = baseCmap(base.data[i]);
      img.data[i * 4] = c[0];
      img.data[i * 4 + 1] = c[1];
      img.data[i * 4 + 2] = c[2];
      img.data[i * 4 + 3] = 255;
    }
    for (const layer of overlays) {
      const cmap = COLORMAPS[layer.colormap];
      const op = layer.opacity ?? 0.75;
      for (let i = 0; i < layer.data.length; i++) {
        const v = layer.data[i];
        if (layer.threshold !== undefined && v < layer.threshold) continue;
        const w = (layer.threshold !== undefined ? (v - layer.threshold) / (1 - layer.threshold) : v) * op;
        const c = cmap(v);
        img.data[i * 4] = img.data[i * 4] * (1 - w) + c[0] * w;
        img.data[i * 4 + 1] = img.data[i * 4 + 1] * (1 - w) + c[1] * w;
        img.data[i * 4 + 2] = img.data[i * 4 + 2] * (1 - w) + c[2] * w;
      }
    }
    ox.putImageData(img, 0, 0);

    // Draw scaled to main canvas.
    ctx.fillStyle = "#0c0e14";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(off, 0, 0, cv.width, cv.height);

    // HUD grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(120, 180, 220, 0.08)";
      ctx.lineWidth = 1;
      const step = cv.width / 16;
      for (let i = 1; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, cv.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(cv.width, i * step);
        ctx.stroke();
      }
      // crosshair
      ctx.strokeStyle = "rgba(120, 180, 220, 0.25)";
      ctx.beginPath();
      ctx.moveTo(cv.width / 2, 0);
      ctx.lineTo(cv.width / 2, cv.height);
      ctx.moveTo(0, cv.height / 2);
      ctx.lineTo(cv.width, cv.height / 2);
      ctx.stroke();
    }

    const scale = cv.width / GRID;

    // Path
    if (path && path.length > 1) {
      ctx.strokeStyle = "rgba(255, 200, 80, 0.95)";
      ctx.lineWidth = 2.5 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(path[0].x * scale + scale / 2, path[0].y * scale + scale / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * scale + scale / 2, path[i].y * scale + scale / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Target
    if (target) {
      const cx = target.x * scale + scale / 2;
      const cy = target.y * scale + scale / 2;
      ctx.strokeStyle = "rgba(120, 220, 255, 0.95)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 14 * dpr, cy);
      ctx.lineTo(cx + 14 * dpr, cy);
      ctx.moveTo(cx, cy - 14 * dpr);
      ctx.lineTo(cx, cy + 14 * dpr);
      ctx.stroke();
    }

    // Sites
    for (const s of sites) {
      const cx = s.x * scale + scale / 2;
      const cy = s.y * scale + scale / 2;
      ctx.fillStyle = s.active ? "rgba(255, 200, 80, 1)" : "rgba(255, 200, 80, 0.55)";
      ctx.strokeStyle = "rgba(20, 22, 30, 0.95)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.rect(cx - 5 * dpr, cy - 5 * dpr, 10 * dpr, 10 * dpr);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 230, 180, 0.95)";
      ctx.font = `${10 * dpr}px ui-monospace, JetBrains Mono, monospace`;
      ctx.fillText(s.label, cx + 9 * dpr, cy - 6 * dpr);
    }

    // Frame
    ctx.strokeStyle = "rgba(120, 180, 220, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1);
  }, [base, overlays, sites, path, target, showGrid]);

  return (
    <canvas
      ref={ref}
      className={className}
      onClick={(e) => {
        if (!onPick) return;
        const cv = ref.current!;
        const rect = cv.getBoundingClientRect();
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID);
        onPick(x, y);
      }}
      style={{ width: "100%", aspectRatio: "1 / 1", cursor: onPick ? "crosshair" : "default" }}
    />
  );
}
