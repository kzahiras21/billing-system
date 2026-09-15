import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function AuditLogsPage() {
  await requireUser(["SUPER_ADMIN", "BOD"]);
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Activity Log / Audit Trail</h1>
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ padding: "1rem", textAlign: "left" }}>Timestamp</th><th style={{ padding: "1rem", textAlign: "left" }}>Actor</th><th style={{ padding: "1rem", textAlign: "left" }}>Action</th><th style={{ padding: "1rem", textAlign: "left" }}>Entity</th><th style={{ padding: "1rem", textAlign: "left" }}>Source</th></tr></thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>{log.timestamp.toLocaleString("id-ID")}</td>
                <td style={{ padding: "1rem" }}>{log.actor?.name || "System"}<br/><small>{log.actorRole}</small></td>
                <td style={{ padding: "1rem" }}>{log.action}</td>
                <td style={{ padding: "1rem" }}>{log.entity} <small>({log.entityId.slice(0, 12)})</small></td>
                <td style={{ padding: "1rem" }}><small>{log.ipAddress || "-"}</small></td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center" }}>No activity recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
