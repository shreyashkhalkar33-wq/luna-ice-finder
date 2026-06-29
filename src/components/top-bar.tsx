import { useEffect, useState } from "react";
import { CRATER } from "@/lib/lunar-data";

function pad(n: number, w = 2) { return String(n).padStart(w, "0"); }

export function TopBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const utc = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;
  // Fake MET starting at epoch — gives a moving counter.
  const met = Math.floor((now.getTime() / 1000) % 100000);

  return (
    <div className="flex h-12 items-center gap-3 border-b border-border bg-card/50 px-3 backdrop-blur">
      <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" style={{ animation: "blink 1.6s infinite" }} />
        SYSTEM
      </div>
      <div className="text-mono text-xs text-foreground/90">{utc}</div>
      <span className="h-4 w-px bg-border" />
      <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider">MET</div>
      <div className="text-mono text-xs text-amber">T+{pad(met, 6)}</div>
      <span className="h-4 w-px bg-border" />
      <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider">Target</div>
      <div className="text-mono text-xs text-foreground/90">{CRATER.name} <span className="text-muted-foreground">/ {CRATER.id}</span></div>
      <span className="h-4 w-px bg-border" />
      <div className="text-mono text-[10px] text-muted-foreground uppercase tracking-wider">LAT/LON</div>
      <div className="text-mono text-xs text-accent">{CRATER.lat}° / {CRATER.lon.toFixed(2)}°</div>
      <div className="ml-auto flex items-center gap-3">
        <Chip label="DFSAR" value="LOCKED" tone="ok" />
        <Chip label="OHRC" value="LOCKED" tone="ok" />
        <Chip label="DEM" value="ALIGNED" tone="ok" />
        <Chip label="AI" value="ONLINE" tone="amber" />
      </div>
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone: "ok" | "amber" | "warn" }) {
  const color = tone === "ok" ? "text-ok" : tone === "amber" ? "text-amber" : "text-warn";
  return (
    <div className="flex items-center gap-1.5 text-mono text-[10px] uppercase">
      <span className="text-muted-foreground tracking-wider">{label}</span>
      <span className={`${color} tracking-wider`}>{value}</span>
    </div>
  );
}
