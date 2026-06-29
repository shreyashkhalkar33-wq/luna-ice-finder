import { createFileRoute } from "@tanstack/react-router";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat } from "@/components/panel";
import { Header } from "./ingestion";
import { getDataset } from "@/lib/lunar-data";

export const Route = createFileRoute("/radar")({
  head: () => ({ meta: [{ title: "Radar Processing · LunaVision" }] }),
  component: Page,
});

function Page() {
  const d = getDataset();
  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M02" name="Radar Processing" desc="DFSAR L-band backscatter, circular polarization ratio (CPR), and degree of polarization (DOP) extraction." />

      <div className="grid grid-cols-12 gap-4">
        <Tile title="Backscatter (σ°)" code="σ°" base={d.backscatter} cmap="backscatter" mean={mean(d.backscatter)} />
        <Tile title="CPR · Circular Polarization Ratio" code="CPR" base={d.cpr} cmap="cpr" mean={mean(d.cpr)} hint="High CPR → coherent backscatter (ice or rough rock)" />
        <Tile title="DOP · Degree of Polarization" code="DOP" base={d.dop} cmap="dop" mean={mean(d.dop)} hint="Low DOP → volumetric scattering (ice-like)" />

        <div className="col-span-12">
          <Panel title="Radar Feature Pipeline" code="PIPE">
            <ol className="grid grid-cols-1 gap-2 text-mono text-xs md:grid-cols-5">
              {pipeline.map((s, i) => (
                <li key={s} className="rounded-md border border-panel-border bg-background/50 px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">STEP {String(i + 1).padStart(2, "0")}</div>
                  <div className="text-foreground/90">{s}</div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Tile({ title, code, base, cmap, mean, hint }: { title: string; code: string; base: Float32Array; cmap: any; mean: number; hint?: string }) {
  return (
    <div className="col-span-12 lg:col-span-4">
      <Panel title={title} code={code}>
        <MapCanvas base={{ data: base, colormap: cmap }} showGrid={false} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Mean" value={mean.toFixed(2)} />
          <Stat label="Max" value={Math.max(...Array.from(base)).toFixed(2)} tone="amber" />
        </div>
        {hint && <p className="mt-2 text-mono text-[10px] text-muted-foreground">{hint}</p>}
      </Panel>
    </div>
  );
}

function mean(g: Float32Array) { let s = 0; for (let i = 0; i < g.length; i++) s += g[i]; return s / g.length; }

const pipeline = [
  "Speckle filter (Lee 5×5)",
  "Radiometric calibration",
  "Stokes vector decomposition",
  "CPR & DOP derivation",
  "Normalization to 0..1",
];
