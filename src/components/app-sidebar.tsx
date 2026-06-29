import { Link, useRouterState } from "@tanstack/react-router";
import {
  Radar, Snowflake, Mountain, Target, Route as RouteIcon,
  Database, Gauge, FileText, Activity,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";

const modules = [
  { url: "/", title: "Mission Overview", icon: Gauge, code: "M00" },
  { url: "/ingestion", title: "Data Ingestion", icon: Database, code: "M01" },
  { url: "/radar", title: "Radar Processing", icon: Radar, code: "M02" },
  { url: "/ice-detection", title: "Ice Detection", icon: Snowflake, code: "M03" },
  { url: "/terrain", title: "Terrain & Hazard", icon: Mountain, code: "M04" },
  { url: "/landing", title: "Landing Sites", icon: Target, code: "M05" },
  { url: "/rover", title: "Rover Traverse", icon: RouteIcon, code: "M06" },
  { url: "/volume", title: "Ice Volume", icon: Activity, code: "M07" },
  { url: "/reports", title: "Reports", icon: FileText, code: "M08" },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="relative h-8 w-8 rounded-md border border-primary/40 bg-gradient-to-br from-amber/20 to-accent/10 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-primary" style={{ boxShadow: "0 0 12px var(--primary)" }} />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-mono text-[11px] uppercase tracking-[0.18em] text-primary">LunaVision</div>
            <div className="text-mono text-[10px] text-muted-foreground">ISRO · Chandrayaan-2</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-mono text-[10px] tracking-[0.2em]">MISSION MODULES</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((m) => {
                const active = pathname === m.url;
                return (
                  <SidebarMenuItem key={m.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={m.url} className="flex items-center gap-2">
                        <m.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{m.title}</span>
                        <span className="text-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">{m.code}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" style={{ animation: "blink 1.6s infinite" }} />
            LINK NOMINAL · v1.0
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
