import { createFileRoute, Link } from "@tanstack/react-router";
import { MapCanvas } from "@/components/map-canvas";
import { Panel, Stat, Bar, Legend } from "@/components/panel";
import {
  getDataset, getLandingSites, estimateIceVolume, planTraverse, CRATER,
} from "@/lib/lunar-data";
import { ArrowRight, Snowflake, Target, Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mission Overview · LunaVision" },
      { name: "description", content: "Live overview of the LunaVision lunar subsurface ice detection mission." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const d = getDataset();
  const sites = getLandingSites();
  const top = sites[0];
  const vol = estimateIceVolume(0.55);
  const traverse = top ? planTraverse({ x: top.x, y: top.y }, findIceTarget(d.iceProbability)) : null;

  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-mono text-[10px] uppercase tracking-[0.3em] text-amber">/// MISSION OVERVIEW</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">LunaVision Mission Console</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            AI-assisted decision support for subsurface ice prospecting in the lunar south-pole permanently
            shadowed region. DFSAR + OHRC + DEM fusion · {CRATER.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/ice-detection" className="chip hover:border-amber/60 hover:text-amber transition-colors">
            <Snowflake className="h-3 w-3" /> Ice map
          </Link>
          <Link to="/landing" className="chip hover:border-amber/60 hover:text-amber transition-colors">
            <Target className="h-3 w-3" /> Landing sites
          </Link>
          <Link to="/rover" className="chip hover:border-amber/60 hover:text-amber transition-colors">
            <RouteIcon className="h-3 w-3" /> Plan traverse
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-1">
          <Stat label="Top Ice Probability" value={(d.iceProbability.reduce((a, b) => Math.max(a, b), 0) * 100).toFixed(1)} unit="%" tone="ice" />
          <Stat label="Mean CPR" value={mean(d.cpr).toFixed(2)} tone="amber" />
          <Stat label="Mean DOP" value={mean(d.dop).toFixed(2)} />
          <Stat label="PSR Coverage" value={(coverage(d.illumination, 0.2, true) * 100).toFixed(0)} unit="%" tone="ice" />
          <Stat label="Safe Terrain" value={(coverage(d.hazard, 0.4, true) * 100).toFixed(0)} unit="%" tone="ok" />
          <Stat label="Candidate Sites" value={sites.length} tone="amber" />
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Panel title="Fused Mission Map" code="PRIMARY">
            <MapCanvas
              base={{ data: d.dem, colormap: "dem" }}
              overlays={[{ data: d.iceProbability, colormap: "ice", opacity: 0.85, threshold: 0.45 }]}
              sites={sites.map((s, i) => ({ x: s.x, y: s.y, label: `LS-0${i + 1}`, active: i === 0 }))}
              path={traverse?.path}
              target={traverse ? traverse.path[traverse.path.length - 1] : undefined}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Legend items={[
                { color: "linear-gradient(90deg,#161820,#e6dcc8)", label: "DEM (elevation)" },
                { color: "linear-gradient(90deg,#0a3c5a,#78dceb,#ffffff)", label: "Ice probability" },
                { color: "#ffc850", label: "Landing candidate" },
                { color: "repeating-linear-gradient(90deg,#ffc850 0 6px,transparent 6px 10px)", label: "Rover traverse" },
              ]} />
              <div className="text-mono text-[10px] text-muted-foreground">128 × 128 cells · ~10 km / side</div>
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Panel title="Ice Volume Estimate" code="M07">
            <div className="space-y-3">
              <Stat label="Detection Area" value={vol.area_km2.toFixed(2)} unit="km²" tone="ice" />
              <Stat label="Recoverable Mass" value={(vol.mass_t / 1000).toFixed(1)} unit="kt H₂O" tone="amber" />
              <div className="text-mono text-[10px] text-muted-foreground">
                CI 90%: {(vol.ci_low_t / 1000).toFixed(1)} – {(vol.ci_high_t / 1000).toFixed(1)} kt
              </div>
              <Bar value={vol.meanProb} tone="ice" />
            </div>
          </Panel>

          {top && (
            <Panel title="Primary Landing Candidate" code={top.id}>
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">{top.name}</span>
                  <span className="text-mono text-xs text-amber">{(top.score * 100).toFixed(0)} / 100</span>
                </div>
                <Row label="Safety" v={top.safety} tone="ok" />
                <Row label="Ice proximity" v={top.iceProximity} tone="ice" />
                <Row label="Illumination" v={top.illumination} tone="amber" />
                <Row label="Comms LOS" v={top.comms} />
                <p className="text-xs text-muted-foreground">{top.rationale}</p>
                <Link to="/landing" className="mt-1 inline-flex items-center gap-1 text-mono text-[10px] uppercase tracking-wider text-amber hover:underline">
                  Review all candidates <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Panel>
          )}
        </div>

        <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Panel title="Pipeline Status" code="ORCH">
            <ol className="space-y-2 text-mono text-xs">
              {[
                ["M01 Ingestion", "OK"],
                ["M02 Radar processing", "OK"],
                ["M03 Ice detection", "OK"],
                ["M04 Terrain analysis", "OK"],
                ["M05 Landing rec.", "OK"],
                ["M06 Rover planning", "OK"],
                ["M07 Volume estimate", "OK"],
                ["M08 Reporting", "READY"],
              ].map(([label, status]) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-foreground/90">{label}</span>
                  <span className={status === "OK" ? "text-ok" : "text-amber"}>{status}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Crater Brief" code={CRATER.id}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-mono text-xs">
              <Row2 k="Target" v={CRATER.name} />
              <Row2 k="Region" v={CRATER.region} />
              <Row2 k="Latitude" v={`${CRATER.lat}°`} />
              <Row2 k="Longitude" v={`${CRATER.lon.toFixed(2)}°`} />
              <Row2 k="Diameter" v={`${CRATER.diameter_km} km`} />
              <Row2 k="Depth" v={`${CRATER.depth_km} km`} />
              <Row2 k="Surface T" v="−170 °C est." />
              <Row2 k="Illumination" v="< 20% / year" />
            </dl>
          </Panel>

          <Panel title="Live Telemetry Feed" code="TLM">
            <ul className="space-y-1.5 text-mono text-[11px]">
              {feed.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{f.t}</span>
                  <span className={f.tone === "ok" ? "text-ok" : f.tone === "warn" ? "text-warn" : "text-foreground/90"}>{f.msg}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v, tone }: { label: string; v: number; tone?: "ok" | "amber" | "ice" }) {
  return (
    <div>
      <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground/90">{(v * 100).toFixed(0)}%</span>
      </div>
      <Bar value={v} tone={tone} />
    </div>
  );
}

function Row2({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</dt>
      <dd className="text-foreground/90 text-right">{v}</dd>
    </>
  );
}

function mean(g: Float32Array) {
  let s = 0;
  for (let i = 0; i < g.length; i++) s += g[i];
  return s / g.length;
}
function coverage(g: Float32Array, thr: number, below = false) {
  let n = 0;
  for (let i = 0; i < g.length; i++) if ((below ? g[i] < thr : g[i] >= thr)) n++;
  return n / g.length;
}
function findIceTarget(ice: Float32Array): { x: number; y: number } {
  let bx = 64, by = 64, bv = -1;
  const G = 128;
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const v = ice[y * G + x];
    if (v > bv) { bv = v; bx = x; by = y; }
  }
  return { x: bx, y: by };
}

const feed = [
  { t: "T+00:01:22", msg: "DFSAR L-band pass ingested · 4 tiles", tone: "ok" },
  { t: "T+00:01:25", msg: "OHRC tile registered to DEM · 0.4 px RMS", tone: "ok" },
  { t: "T+00:01:31", msg: "CPR/DOP rasters generated", tone: "ok" },
  { t: "T+00:01:48", msg: "Ice probability engine converged · 22 iter", tone: "ok" },
  { t: "T+00:01:52", msg: "5 landing candidates ranked", tone: "ok" },
  { t: "T+00:02:04", msg: "Traverse plan optimized (A* hazard-weighted)", tone: "ok" },
  { t: "T+00:02:11", msg: "Volume CI ±30% (radar ambiguity)", tone: "warn" },
];
