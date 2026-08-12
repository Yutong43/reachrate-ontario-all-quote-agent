import onlineRouteAudit from "@/data/online-route-audit.json";

export type RouteAuditRecord = {
  route_id: string;
  name: string;
  official_url: string;
  classification: string;
  audit_status: string;
  test_depth: string;
  price_returned: boolean | null;
  checkpoint_kind: string | null;
  user_action_required: string;
  evidence_note: string;
  public_phone?: string | null;
  engine_family?: string | null;
  deduplicates_with?: string[];
};

export const routeAudit = onlineRouteAudit;

export const routeAuditById = new Map(
  (onlineRouteAudit.routes as RouteAuditRecord[]).map((record) => [
    record.route_id,
    record,
  ]),
);

export function auditStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}
