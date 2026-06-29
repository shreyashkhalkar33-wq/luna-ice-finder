import { createFileRoute } from "@tanstack/react-router";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat } from "@/components/panel";
import { Header } from "./ingestion";
import { getDataset } from "@/lib/lunar-data";

export const Route = createFileRoute("/terrain")({
  head: () => ({ meta: [{ title: "Terrain & Hazard · LunaVision" }] }),
  component: Page,
});

function Page() {
  const d = getDataset();
  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M04" name="Terrain & Hazard Analysis" desc="Slope, roughness, boulder density, illumination, and a composite hazard map for landing & traverse." />

      <div className="grid grid-cols-12 gap-4">
        <Tile span={8} title="Composite Hazard Map" code="HAZ" data={d.hazard} cmap="hazard" />
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Terrain Summary" code="SUM">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Mean Slope" value={(mean(d.slope) * 30).toFixed(1)} unit="°" tone="amber" />
              <Stat label="Max Slope" value={(Math.max(...Array.from(d.slope)) * 30).toFixed(0)} unit="°" tone="hazard" />
              <Stat label="Boulder Density" value={(mean(d.boulderDensity) * 100).toFixed(0)} unit="/km²" />
              <Stat label="Safe Area" value={(coverage(d.hazard, 0.4, true) * 100).toFixed(0)} unit="%" tone="ok" />
              <Stat label="Mean Illum." value={(mean(d.illumination) * 100).toFixed(0)} unit="%" tone="amber" />
              <Stat label="PSR Coverage" value={(coverage(d.illumination, 0.1, true) * 100).toFixed(0)} unit="%" tone="ice" />
            </div>
          </Panel>
          <Panel title="Hazard Bands" code="BAND">
            <ul className="space-y-2 text-mono text-xs">
              {bands.map((b) => (
                <li key={b.label} className="flex items-center gap-2">
                  <span className="h-3 w-6 rounded-sm" style={{ background: b.color }} />
                  <span className="flex-1">{b.label}</span>
                  <span className="text-muted-foreground">{b.range}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Tile span={4} title="Slope" code="SLP" data={d.slope} cmap="slope" />
        <Tile span={4} title="Illumination" code="ILL" data={d.illumination} cmap="illumination" />
        <Tile span={4} title="DEM" code="DEM" data={d.dem} cmap="dem" />
      </div>
    </div>
  );
}

function Tile({ span, title, code, data, cmap }: { span: number; title: string; code: string; data: Float32Array; cmap: any }) {
  return (
    <div className={`col-span-12 lg:col-span-${span}`}>
      <Panel title={title} code={code}>
        <MapCanvas base={{ data, colormap: cmap }} showGrid={false} />
      </Panel>
    </div>
  );
}

const bands = [
  { label: "Safe (slope < 8°, boulder-free)", range: "0.00 – 0.40", color: "rgb(80,160,90)" },
  { label: "Marginal", range: "0.40 – 0.70", color: "rgb(220,170,60)" },
  { label: "Hazardous (no-go)", range: "0.70 – 1.00", color: "rgb(220,70,50)" },
];

function mean(g: Float32Array) { let s = 0; for (let i = 0; i < g.length; i++) s += g[i]; return s / g.length; }
function coverage(g: Float32Array, thr: number, below = false) {
  let n = 0; for (let i = 0; i < g.length; i++) if (below ? g[i] < thr : g[i] >= thr) n++;
  return n / g.length;
}
