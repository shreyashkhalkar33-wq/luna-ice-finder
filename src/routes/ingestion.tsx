import { createFileRoute } from "@tanstack/react-router";
import { Panel, Stat } from "@/components/panel";
import { CRATER } from "@/lib/lunar-data";
import { CheckCircle2, FileWarning } from "lucide-react";

export const Route = createFileRoute("/ingestion")({
  head: () => ({ meta: [{ title: "Data Ingestion · LunaVision" }] }),
  component: Page,
});

const datasets = [
  { id: "DFSAR-L-001", instrument: "Chandrayaan-2 DFSAR", band: "L (1.25 GHz)", res: "2 m × 75 m", size: "1.42 GB", status: "validated", tiles: 4 },
  { id: "DFSAR-S-002", instrument: "Chandrayaan-2 DFSAR", band: "S (2.5 GHz)", res: "2 m × 75 m", size: "1.31 GB", status: "validated", tiles: 4 },
  { id: "OHRC-PSR-014", instrument: "Chandrayaan-2 OHRC", band: "Optical", res: "0.32 m/px", size: "812 MB", status: "validated", tiles: 9 },
  { id: "TMC2-DEM-008", instrument: "Chandrayaan-2 TMC-2 DEM", band: "Stereo", res: "5 m/px", size: "224 MB", status: "validated", tiles: 1 },
  { id: "OHRC-PSR-015", instrument: "Chandrayaan-2 OHRC", band: "Optical", res: "0.32 m/px", size: "780 MB", status: "warning", tiles: 9, note: "Partial shadow saturation" },
];

function Page() {
  return (
    <div className="hud-grid min-h-[calc(100vh-6rem)] p-4">
      <Header code="M01" name="Data Ingestion" desc="Validate, align, and stage Chandrayaan-2 rasters for the processing pipeline." />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-1">
          <Stat label="Datasets Loaded" value={datasets.length} tone="amber" />
          <Stat label="Total Volume" value="4.55" unit="GB" />
          <Stat label="Alignment RMS" value="0.4" unit="px" tone="ok" />
          <Stat label="Validation Warnings" value="1" tone="warn" />
        </div>

        <div className="col-span-12 lg:col-span-8">
          <Panel title="Ingested Rasters" code="MANIFEST">
            <div className="overflow-x-auto">
              <table className="w-full text-mono text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-panel-border">
                    <th className="px-2 py-2 text-left">ID</th>
                    <th className="px-2 py-2 text-left">Instrument</th>
                    <th className="px-2 py-2 text-left">Band</th>
                    <th className="px-2 py-2 text-left">Res</th>
                    <th className="px-2 py-2 text-right">Tiles</th>
                    <th className="px-2 py-2 text-right">Size</th>
                    <th className="px-2 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => (
                    <tr key={d.id} className="border-b border-panel-border/60 hover:bg-card/50">
                      <td className="px-2 py-2 text-amber">{d.id}</td>
                      <td className="px-2 py-2 text-foreground/90">{d.instrument}</td>
                      <td className="px-2 py-2">{d.band}</td>
                      <td className="px-2 py-2">{d.res}</td>
                      <td className="px-2 py-2 text-right">{d.tiles}</td>
                      <td className="px-2 py-2 text-right">{d.size}</td>
                      <td className="px-2 py-2">
                        {d.status === "validated" ? (
                          <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 className="h-3 w-3" /> OK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-warn" title={d.note}><FileWarning className="h-3 w-3" /> WARN</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Panel title="Validation Log" code="LOG">
            <ul className="space-y-1.5 text-mono text-[11px]">
              {validationLog.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{l.t}</span>
                  <span className={l.lvl === "OK" ? "text-ok" : l.lvl === "WARN" ? "text-warn" : "text-foreground/90"}>[{l.lvl}]</span>
                  <span className="text-foreground/90">{l.msg}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Panel title="Target ROI" code="ROI">
            <dl className="grid grid-cols-2 gap-2 text-mono text-xs">
              <Cell k="Region" v={CRATER.region} />
              <Cell k="Crater" v={CRATER.name} />
              <Cell k="Center Lat" v={`${CRATER.lat}°`} />
              <Cell k="Center Lon" v={`${CRATER.lon.toFixed(2)}°`} />
              <Cell k="Bbox" v="−89.8°S → −89.5°S" />
              <Cell k="Diameter" v={`${CRATER.diameter_km} km`} />
              <Cell k="Projection" v="Polar Stereographic" />
              <Cell k="EPSG" v="IAU_2015:30130" />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="text-foreground/90 text-right">{v}</dd>
    </>
  );
}

export function Header({ code, name, desc }: { code: string; name: string; desc: string }) {
  return (
    <div className="mb-4">
      <div className="text-mono text-[10px] uppercase tracking-[0.3em] text-amber">/// MODULE {code}</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

const validationLog = [
  { t: "00:00:02", lvl: "OK",   msg: "DFSAR L-band manifest parsed (4 tiles)" },
  { t: "00:00:04", lvl: "OK",   msg: "Reprojected to polar stereographic" },
  { t: "00:00:08", lvl: "OK",   msg: "Radiometric calibration applied" },
  { t: "00:00:12", lvl: "OK",   msg: "OHRC ↔ DEM alignment · RMS 0.4 px" },
  { t: "00:00:13", lvl: "WARN", msg: "OHRC-PSR-015: 2.1% saturation in shadow zone" },
  { t: "00:00:15", lvl: "OK",   msg: "All rasters resampled to 80 m common grid" },
  { t: "00:00:16", lvl: "OK",   msg: "Manifest sealed (SHA-256 verified)" },
];
