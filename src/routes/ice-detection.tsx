import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat, Bar } from "@/components/panel";
import { Header } from "./ingestion";
import { getDataset, GRID } from "@/lib/lunar-data";

export const Route = createFileRoute("/ice-detection")({
  head: () => ({ meta: [{ title: "Ice Detection · LunaVision" }] }),
  component: Page,
});

function Page() {
  const d = getDataset();
  const [threshold, setThreshold] = useState(0.55);
  const [pick, setPick] = useState<{ x: number; y: number } | null>(null);

  const coverage = count(d.iceProbability, threshold) / d.iceProbability.length;
  const meanProb = meanAbove(d.iceProbability, threshold);

  const cellInfo = pick ? (() => {
    const i = pick.y * GRID + pick.x;
    return {
      ice: d.iceProbability[i],
      cpr: d.cpr[i],
      dop: d.dop[i],
      backscatter: d.backscatter[i],
      slope: d.slope[i],
      illumination: d.illumination[i],
      hazard: d.hazard[i],
    };
  })() : null;

  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M03" name="Ice Detection" desc="Fuse CPR, DOP, backscatter, and illumination into an explainable subsurface-ice probability map." />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Panel
            title="Ice Probability Map"
            code="P(ice)"
            action={
              <div className="flex items-center gap-3">
                <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Threshold</span>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="h-1 w-32 accent-amber"
                />
                <span className="text-mono text-xs text-amber w-10 text-right">{threshold.toFixed(2)}</span>
              </div>
            }
          >
            <MapCanvas
              base={{ data: d.dem, colormap: "dem" }}
              overlays={[{ data: d.iceProbability, colormap: "ice", opacity: 0.9, threshold }]}
              onPick={(x, y) => setPick({ x, y })}
              target={pick ?? undefined}
            />
            <p className="mt-2 text-mono text-[10px] text-muted-foreground">Click anywhere on the map to inspect a cell.</p>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Detection Stats" code="STAT">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Coverage" value={(coverage * 100).toFixed(1)} unit="%" tone="ice" />
              <Stat label="Mean P(ice)" value={meanProb.toFixed(2)} tone="ice" />
              <Stat label="Peak P(ice)" value={Math.max(...Array.from(d.iceProbability)).toFixed(2)} tone="amber" />
              <Stat label="High-conf cells" value={count(d.iceProbability, 0.75)} />
            </div>
          </Panel>

          <Panel title="Cell Inspector" code="XAI">
            {cellInfo ? (
              <div className="space-y-2.5">
                <div className="text-mono text-[10px] text-muted-foreground">
                  Cell ({pick!.x}, {pick!.y}) · ~{(pick!.x * 0.08).toFixed(2)}, {(pick!.y * 0.08).toFixed(2)} km from origin
                </div>
                <Row label="P(ice)" v={cellInfo.ice} tone="ice" big />
                <Row label="CPR" v={cellInfo.cpr} tone="amber" />
                <Row label="DOP" v={cellInfo.dop} />
                <Row label="Backscatter" v={cellInfo.backscatter} />
                <Row label="Illumination" v={cellInfo.illumination} />
                <Row label="Slope" v={cellInfo.slope} tone="amber" />
                <Row label="Hazard" v={cellInfo.hazard} tone="amber" />
                <div className="mt-2 rounded-md border border-panel-border bg-background/50 p-2 text-xs">
                  <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Explanation</div>
                  <p className="mt-1 text-foreground/85">{explain(cellInfo)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a cell on the map to see its feature breakdown and AI reasoning.</p>
            )}
          </Panel>
        </div>

        <div className="col-span-12">
          <Panel title="Model Notes" code="MODEL">
            <p className="text-sm text-foreground/85">
              P(ice) = 0.45·CPR + 0.30·(1 − DOP) + 0.35·shadow − 0.25·roughness — a rule-based scientific baseline that
              combines polarimetric signatures with terrain context, designed to minimize false positives from rough basalt.
              A learned residual will refine the result once labeled training tiles are available.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v, tone, big }: { label: string; v: number; tone?: "ice" | "amber"; big?: boolean }) {
  const cls = tone === "ice" ? "text-ice" : tone === "amber" ? "text-amber" : "text-foreground/90";
  return (
    <div>
      <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className={`${cls} ${big ? "text-base" : ""}`}>{(v * 100).toFixed(big ? 1 : 0)}%</span>
      </div>
      <Bar value={v} tone={tone ?? "ice"} />
    </div>
  );
}

function explain(c: { ice: number; cpr: number; dop: number; illumination: number; slope: number }) {
  const parts: string[] = [];
  if (c.cpr > 0.6) parts.push("elevated CPR consistent with coherent volume scattering");
  if (c.dop < 0.5) parts.push("low DOP suggests volumetric (non-surface) scatter");
  if (c.illumination < 0.2) parts.push("permanently shadowed — cold trap conditions");
  if (c.slope > 0.5) parts.push("but high slope reduces confidence (rough-rock ambiguity)");
  if (!parts.length) parts.push("signatures do not strongly support subsurface ice");
  return parts.join("; ") + ".";
}

function count(g: Float32Array, thr: number) { let n = 0; for (let i = 0; i < g.length; i++) if (g[i] >= thr) n++; return n; }
function meanAbove(g: Float32Array, thr: number) {
  let s = 0; let n = 0;
  for (let i = 0; i < g.length; i++) if (g[i] >= thr) { s += g[i]; n++; }
  return n ? s / n : 0;
}
