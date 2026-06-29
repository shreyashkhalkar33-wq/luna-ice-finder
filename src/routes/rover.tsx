import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat } from "@/components/panel";
import { Header } from "./ingestion";
import { getDataset, getLandingSites, planTraverse, GRID } from "@/lib/lunar-data";

export const Route = createFileRoute("/rover")({
  head: () => ({ meta: [{ title: "Rover Traverse · LunaVision" }] }),
  component: Page,
});

function Page() {
  const d = getDataset();
  const sites = getLandingSites();
  const [startIdx, setStartIdx] = useState(0);
  const [target, setTarget] = useState<{ x: number; y: number }>(() => bestIce(d.iceProbability));

  const start = sites[startIdx];
  const plan = useMemo(() => planTraverse({ x: start.x, y: start.y }, target, d), [start, target, d]);

  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M06" name="Rover Traverse Planning" desc="Hazard-aware A* path planning from a landing candidate to a high-probability ice target." />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Panel
            title="Traverse Map"
            code="A*"
            action={
              <div className="flex items-center gap-2">
                <span className="text-mono text-[10px] uppercase text-muted-foreground tracking-wider">Start</span>
                <select
                  value={startIdx}
                  onChange={(e) => setStartIdx(parseInt(e.target.value))}
                  className="text-mono text-xs bg-background border border-panel-border rounded px-2 py-1"
                >
                  {sites.map((s, i) => <option value={i} key={s.id}>{s.id} {s.name}</option>)}
                </select>
              </div>
            }
          >
            <MapCanvas
              base={{ data: d.dem, colormap: "dem" }}
              overlays={[
                { data: d.iceProbability, colormap: "ice", opacity: 0.7, threshold: 0.55 },
                { data: d.hazard, colormap: "hazard", opacity: 0.35, threshold: 0.7 },
              ]}
              sites={[{ x: start.x, y: start.y, label: start.id, active: true }]}
              path={plan.path}
              target={target}
              onPick={(x, y) => setTarget({ x, y })}
            />
            <p className="mt-2 text-mono text-[10px] text-muted-foreground">Click the map to set a new rover target.</p>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Traverse Plan" code="PLAN">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Distance" value={plan.distance_km.toFixed(2)} unit="km" tone="amber" />
              <Stat label="Duration" value={plan.duration_h.toFixed(1)} unit="h" />
              <Stat label="Energy" value={plan.energy_kwh.toFixed(2)} unit="kWh" tone="amber" />
              <Stat label="Max slope" value={(plan.maxSlope * 30).toFixed(0)} unit="°" tone={plan.maxSlope > 0.6 ? "warn" : "ok"} />
              <Stat label="Waypoints" value={plan.path.length} />
              <Stat label="Hazard exp." value={(plan.hazardExposure * 100).toFixed(0)} unit="%" tone={plan.hazardExposure > 0.4 ? "warn" : "ok"} />
            </div>
          </Panel>

          <Panel title="Mission Constraints" code="CFG">
            <ul className="space-y-1.5 text-mono text-xs">
              <li className="flex justify-between"><span className="text-muted-foreground">Rover speed</span><span>0.08 km/h (PSR)</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Max climb</span><span>20°</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Battery</span><span>12 kWh</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Hazard cutoff</span><span>0.72</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Algorithm</span><span>A* (8-conn)</span></li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function bestIce(g: Float32Array): { x: number; y: number } {
  let bx = 64, by = 64, bv = -1;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const v = g[y * GRID + x];
    if (v > bv) { bv = v; bx = x; by = y; }
  }
  return { x: bx, y: by };
}
