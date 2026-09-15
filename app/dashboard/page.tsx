import styles from "./dashboard.module.css";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const marketingScope = user.role === "MARKETING" ? { marketingId: user.id } : {};

  const [activeClients, freezeClients] = await Promise.all([
    prisma.subscriber.count({ where: { status: "ACTIVE", ...marketingScope } }),
    prisma.subscriber.count({ where: { status: "FREEZE", ...marketingScope } }),
  ]);

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const invoiceScope = user.role === "MARKETING" ? { subscriber: { marketingId: user.id } } : {};
  const [invoicedResult, collectedResult, topOverdue] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: currentMonthStart }, ...invoiceScope },
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: "PAID", paidAt: { gte: currentMonthStart }, ...invoiceScope },
    }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE", ...invoiceScope },
      include: { subscriber: { include: { customer: true } } },
      orderBy: { totalAmount: "desc" },
      take: 5,
    }),
  ]);

  const totalInvoiced = invoicedResult._sum.totalAmount || 0;
  const totalCollected = collectedResult._sum.totalAmount || 0;
  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : "0.0";

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Dashboard Overview</h1>
      <div className={styles.grid}>
        <div className={`glass-panel ${styles.card}`}><h3>Active Sites</h3><p style={{ color: "var(--status-success)" }}>{activeClients}</p></div>
        <div className={`glass-panel ${styles.card}`}><h3>Frozen Sites</h3><p style={{ color: "var(--status-warning)" }}>{freezeClients}</p></div>
        <div className={`glass-panel ${styles.card}`}><h3>Collected This Month</h3><p>Rp {totalCollected.toLocaleString("id-ID")}</p><small>Invoiced: Rp {totalInvoiced.toLocaleString("id-ID")}</small></div>
        <div className={`glass-panel ${styles.card}`}><h3>Collection Rate</h3><p>{collectionRate}%</p></div>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Top 5 Overdue</h2>
        {topOverdue.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No overdue invoices.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ padding: "0.75rem", textAlign: "left" }}>Customer / Site</th><th style={{ padding: "0.75rem", textAlign: "left" }}>Due Date</th><th style={{ padding: "0.75rem", textAlign: "left" }}>Amount</th></tr></thead>
            <tbody>{topOverdue.map(inv => <tr key={inv.id} style={{ borderTop: "1px solid var(--glass-border)" }}><td style={{ padding: "0.75rem" }}>{inv.subscriber.customer?.name || inv.subscriber.name}<br/><small>{inv.subscriber.siteName || inv.subscriber.address}</small></td><td style={{ padding: "0.75rem" }}>{inv.dueDate.toLocaleDateString("id-ID")}</td><td style={{ padding: "0.75rem" }}>Rp {inv.totalAmount.toLocaleString("id-ID")}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
