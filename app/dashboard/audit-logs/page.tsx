import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { timestamp: "desc" },
    take: 50 // Limit to 50 for Phase 1 view
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Activity Log / Audit Trail</h1>

      <div className={`glass-panel`} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Timestamp</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Actor</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Action</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No activity recorded yet.</td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {log.timestamp.toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {log.actor?.name || "System"}<br/>
                    <small style={{ color: "var(--text-muted)" }}>{log.actorRole}</small>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      background: log.action === "LOGIN" ? "rgba(59, 130, 246, 0.2)" : (log.action === "CREATE" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)"),
                      color: log.action === "LOGIN" ? "var(--accent-primary)" : (log.action === "CREATE" ? "var(--status-success)" : "var(--text-primary)")
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{log.entity} <small>({log.entityId.substring(0,8)}...)</small></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
