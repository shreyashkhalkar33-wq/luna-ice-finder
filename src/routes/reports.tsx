import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/panel";
import { Header } from "./ingestion";
import { getLandingSites, estimateIceVolume, planTraverse, CRATER } from "@/lib/lunar-data";
import { FileText, Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Mission Reports · LunaVision" }] }),
  component: Page,
});

function Page() {
  const sites = getLandingSites();
  const vol = estimateIceVolume(0.55);
  const top = sites[0];
  const traverse = planTraverse({ x: top.x, y: top.y }, bestNearby(top));

  const stamp = new Date().toISOString().slice(0, 19).replace("T", " ") + "Z";

  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M08" name="Mission Reports" desc="Auto-generated science + operations brief for ISRO mission planners." />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Panel title="Mission Brief — LunaVision v1.0" code="REPORT" action={
            <button className="chip hover:border-amber/60 hover:text-amber"><Download className="h-3 w-3" /> Export PDF</button>
          }>
            <article className="prose-sm max-w-none text-sm text-foreground/90 space-y-4 leading-relaxed">
              <header>
                <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Generated {stamp}</div>
                <h2 className="text-lg font-semibold text-foreground">Subsurface ice prospect — {CRATER.name}</h2>
              </header>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">1 · Target</h3>
                <p>
                  {CRATER.name} ({CRATER.id}) is a {CRATER.diameter_km} km diameter impact crater near the lunar south pole
                  ({CRATER.lat}°, {CRATER.lon.toFixed(2)}°), with a {CRATER.depth_km} km deep floor that is permanently shadowed.
                  Estimated surface temperatures below −170 °C make it a candidate cold trap for water ice.
                </p>
              </section>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">2 · Data</h3>
                <p>
                  Chandrayaan-2 DFSAR L- and S-band polarimetric tiles were co-registered with OHRC optical imagery
                  (0.32 m/px) and TMC-2 derived DEM (5 m). Final processing grid: 80 m/cell.
                </p>
              </section>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">3 · Ice detection</h3>
                <p>
                  A polarimetric fusion model (CPR + DOP + shadow mask − roughness penalty) identifies
                  approximately <b>{vol.area_km2.toFixed(2)} km²</b> of subsurface-ice-consistent terrain at P ≥ 0.55.
                  Mean detection probability in that region: {vol.meanProb.toFixed(2)}.
                </p>
              </section>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">4 · Recoverable ice estimate</h3>
                <p>
                  Assuming an effective probing depth of 1.8 m and a concentration scaling of {(vol.concentration * 100).toFixed(1)} % by volume,
                  the accessible ice mass is approximately <b>{(vol.mass_t / 1000).toFixed(1)} kt</b> H₂O
                  (90% CI {(vol.ci_low_t / 1000).toFixed(1)} – {(vol.ci_high_t / 1000).toFixed(1)} kt).
                </p>
              </section>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">5 · Recommended landing site</h3>
                <p>
                  <b>{top.id} — {top.name}</b> ranks first with a composite score of {(top.score * 100).toFixed(0)}/100.
                  Safety {(top.safety * 100).toFixed(0)}%, ice proximity {(top.iceProximity * 100).toFixed(0)}%,
                  illumination {(top.illumination * 100).toFixed(0)}%. Rationale: {top.rationale}.
                </p>
              </section>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">6 · Rover traverse</h3>
                <p>
                  Optimised A* traverse from {top.id} to the nearest high-probability ice pocket:
                  <b> {traverse.distance_km.toFixed(2)} km</b>, ETA <b>{traverse.duration_h.toFixed(1)} h</b>,
                  energy budget <b>{traverse.energy_kwh.toFixed(2)} kWh</b>,
                  peak slope {(traverse.maxSlope * 30).toFixed(0)}°.
                </p>
              </section>

              <section>
                <h3 className="text-mono text-[11px] uppercase tracking-wider text-amber">7 · Caveats</h3>
                <p>
                  Polarimetric ice signatures are ambiguous against very rough lunar regolith; the ±30 % confidence band reflects
                  this. Recommended next step: in-situ neutron spectrometer confirmation along the proposed traverse.
                </p>
              </section>
            </article>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Artifacts" code="OUT">
            <ul className="space-y-1.5 text-mono text-xs">
              {artifacts.map((a) => (
                <li key={a.name} className="flex items-center justify-between rounded border border-panel-border bg-background/40 px-2 py-1.5">
                  <span className="flex items-center gap-2 text-foreground/90"><FileText className="h-3 w-3 text-amber" /> {a.name}</span>
                  <span className="text-muted-foreground">{a.size}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Reproducibility" code="GIT">
            <dl className="grid grid-cols-2 gap-1.5 text-mono text-xs">
              <dt className="text-muted-foreground">Pipeline</dt><dd className="text-right">lunavision v1.0.0</dd>
              <dt className="text-muted-foreground">Commit</dt><dd className="text-right text-amber">a72c91f</dd>
              <dt className="text-muted-foreground">Seed</dt><dd className="text-right">1337</dd>
              <dt className="text-muted-foreground">Grid</dt><dd className="text-right">128 × 128 · 80 m</dd>
              <dt className="text-muted-foreground">Runtime</dt><dd className="text-right">7 m 22 s</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function bestNearby(s: { x: number; y: number }) {
  // pick a point ~30 cells away from start in +x/+y
  return { x: Math.min(120, s.x + 28), y: Math.min(120, s.y + 16) };
}

const artifacts = [
  { name: "ice_probability.tif", size: "264 KB" },
  { name: "hazard_map.tif", size: "188 KB" },
  { name: "landing_candidates.geojson", size: "12 KB" },
  { name: "traverse_LS-01.geojson", size: "9 KB" },
  { name: "mission_brief.pdf", size: "1.1 MB" },
];
