import type { ReactNode } from "react";

export function Panel({
  title, code, action, children, className = "",
}: { title: string; code?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`panel scanline overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-panel-border bg-card/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <h3 className="text-mono text-[11px] uppercase tracking-[0.18em] text-foreground/90">{title}</h3>
          {code && <span className="text-mono text-[10px] text-muted-foreground">/ {code}</span>}
        </div>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function Stat({
  label, value, unit, tone = "default",
}: { label: string; value: string | number; unit?: string; tone?: "default" | "ok" | "amber" | "warn" | "hazard" | "ice" }) {
  const toneCls = {
    default: "text-foreground",
    ok: "text-ok",
    amber: "text-amber",
    warn: "text-warn",
    hazard: "text-hazard",
    ice: "text-ice",
  }[tone];
  return (
    <div className="rounded-md border border-panel-border bg-background/40 px-3 py-2">
      <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className={`text-mono text-xl font-medium ${toneCls}`}>{value}</span>
        {unit && <span className="text-mono text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function Bar({ value, tone = "amber" }: { value: number; tone?: "amber" | "ice" | "ok" | "hazard" }) {
  const cls = { amber: "bg-amber", ice: "bg-ice", ok: "bg-ok", hazard: "bg-hazard" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60 border border-panel-border">
      <div className={`h-full ${cls}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm" style={{ background: it.color }} />
          <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
