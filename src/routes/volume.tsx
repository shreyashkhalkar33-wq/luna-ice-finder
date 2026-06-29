import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat, Bar } from "@/components/panel";
import { Header } from "./ingestion";
import { getDataset, estimateIceVolume } from "@/lib/lunar-data";

export const Route = createFileRoute("/volume")({
  head: () => ({ meta: [{ title: "Ice Volume · LunaVision" }] }),
  component: Page,
});

function Page() {
  const d = getDataset();
  const [thr, setThr] = useState(0.55);
  const v = estimateIceVolume(thr);

  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M07" name="Ice Volume Estimation" desc="Integrate the probability map over detection area and assumed effective depth to estimate accessible water-ice mass." />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <Panel
            title="Counted Region"
            code={`P ≥ ${thr.toFixed(2)}`}
            action={
              <div className="flex items-center gap-2">
                <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Threshold</span>
                <input type="range" min={0.3} max={0.9} step={0.01} value={thr}
                  onChange={(e) => setThr(parseFloat(e.target.value))}
                  className="h-1 w-32 accent-amber" />
                <span className="text-mono text-xs text-amber w-10 text-right">{thr.toFixed(2)}</span>
              </div>
            }
          >
            <MapCanvas
              base={{ data: d.dem, colormap: "dem" }}
              overlays={[{ data: d.iceProbability, colormap: "ice", opacity: 0.95, threshold: thr }]}
            />
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <Panel title="Volume Estimate" code="EST">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Area" value={v.area_km2.toFixed(2)} unit="km²" tone="ice" />
              <Stat label="Eff. Depth" value={v.depth_m.toFixed(1)} unit="m" />
              <Stat label="Concentration" value={(v.concentration * 100).toFixed(1)} unit="% vol" />
              <Stat label="Mean P(ice)" value={v.meanProb.toFixed(2)} tone="ice" />
              <Stat label="Volume" value={(v.volume_m3 / 1e6).toFixed(2)} unit="Mm³" />
              <Stat label="Mass" value={(v.mass_t / 1000).toFixed(1)} unit="kt H₂O" tone="amber" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Confidence (90% CI)</span>
                <span className="text-foreground/90">{(v.ci_low_t / 1000).toFixed(1)} – {(v.ci_high_t / 1000).toFixed(1)} kt</span>
              </div>
              <Bar value={v.meanProb} tone="ice" />
            </div>
          </Panel>

          <Panel title="Methodology" code="DOC">
            <ul className="space-y-1.5 text-xs text-foreground/85">
              <li>1. Count cells with P(ice) ≥ threshold.</li>
              <li>2. A = N × (cell_size)² → detection area.</li>
              <li>3. V = A × depth × concentration (concentration ∝ mean P).</li>
              <li>4. M = V × ρ<sub>ice</sub> (917 kg/m³).</li>
              <li>5. CI ±30% reflects radar ambiguity between ice and rough rock.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
