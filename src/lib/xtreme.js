export const STATUS_STYLES = {
  "LIVE": { dot: "bg-status-green", text: "text-status-green", badge: "bg-status-green/10 text-status-green border-status-green/30" },
  "PROVIDER-BACKED": { dot: "bg-status-green", text: "text-status-green", badge: "bg-status-green/10 text-status-green border-status-green/30" },
  "SANDBOX": { dot: "bg-chart-4", text: "text-chart-4", badge: "bg-chart-4/10 text-chart-4 border-chart-4/30" },
  "MOCK/DEV-ONLY": { dot: "bg-text-muted", text: "text-text-muted", badge: "bg-text-muted/10 text-text-muted border-text-muted/30" },
  "NOT-YET-IMPLEMENTED": { dot: "bg-accent-orange", text: "text-accent-orange", badge: "bg-accent-orange/10 text-accent-orange border-accent-orange/30" },
};

export const ENGINE_STYLES = {
  online: "bg-status-green",
  degraded: "bg-chart-4",
  offline: "bg-destructive",
  standby: "bg-text-muted",
};

export const SHORT_STATUS = (s) => s === "NOT-YET-IMPLEMENTED" ? "GAP" : s === "MOCK/DEV-ONLY" ? "MOCK" : s;