import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat, Bar } from "@/components/panel";
import { Header } from "./ingestion";
import { getDataset, getLandingSites } from "@/lib/lunar-data";
import { Target } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "Landing Sites · LunaVision" }] }),
  component: Page,
});

function Page() {
  const d = getDataset();
  const sites = getLandingSites();
  const [active, setActive] = useState(0);
  const sel = sites[active];

  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M05" name="Landing Site Recommendation" desc="Multi-criteria ranking: terrain safety, ice proximity, illumination window, and comms line-of-sight." />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <Panel title="Candidate Map" code="REC">
            <MapCanvas
              base={{ data: d.dem, colormap: "dem" }}
              overlays={[
                { data: d.iceProbability, colormap: "ice", opacity: 0.6, threshold: 0.5 },
                { data: d.hazard, colormap: "hazard", opacity: 0.35, threshold: 0.7 },
              ]}
              sites={sites.map((s, i) => ({ x: s.x, y: s.y, label: s.id, active: i === active }))}
              target={sel}
            />
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <Panel title={`Ranked Candidates`} code="TOP-5">
            <ul className="space-y-1.5">
              {sites.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActive(i)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      i === active
                        ? "border-amber/60 bg-amber/10"
                        : "border-panel-border bg-background/40 hover:border-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className={`h-3.5 w-3.5 ${i === active ? "text-amber" : "text-muted-foreground"}`} />
                        <span className="text-mono text-xs text-amber">{s.id}</span>
                        <span className="text-sm text-foreground/90">{s.name}</span>
                      </div>
                      <span className="text-mono text-xs text-foreground/90">{(s.score * 100).toFixed(0)}</span>
                    </div>
                    <div className="mt-1.5"><Bar value={s.score} tone="amber" /></div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Selected Candidate" code={sel.id}>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Score" value={(sel.score * 100).toFixed(0)} unit="/100" tone="amber" />
                <Stat label="Safety" value={(sel.safety * 100).toFixed(0)} unit="%" tone="ok" />
                <Stat label="Ice prox." value={(sel.iceProximity * 100).toFixed(0)} unit="%" tone="ice" />
                <Stat label="Illum." value={(sel.illumination * 100).toFixed(0)} unit="%" />
              </div>
              <p className="text-xs text-foreground/85">{sel.rationale}</p>
              <div className="rounded-md border border-panel-border bg-background/50 p-2 text-mono text-[10px] text-muted-foreground">
                Lat ≈ {(-89.66 + (sel.y - 64) * 0.0006).toFixed(4)}° · Lon ≈ {(((sel.x - 64) * 0.0009)).toFixed(4)}° · cell ({sel.x}, {sel.y})
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
