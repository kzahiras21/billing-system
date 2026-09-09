import styles from "./dashboard.module.css";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const activeClients = await prisma.subscriber.count({ where: { status: "ACTIVE" } });
  const freezeClients = await prisma.subscriber.count({ where: { status: "FREEZE" } });
  
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0,0,0,0);

  // Total Invoiced this month
  const invoicedResult = await prisma.invoice.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: currentMonthStart }
    }
  });
  
  // Total Collected this month
  const collectedResult = await prisma.invoice.aggregate({
    _sum: { totalAmount: true },
    where: {
      status: "PAID",
      updatedAt: { gte: currentMonthStart } // Approximating based on when it was marked paid
    }
  });

  const totalInvoiced = invoicedResult._sum.totalAmount || 0;
  const totalCollected = collectedResult._sum.totalAmount || 0;
  
  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : "0.0";

  const topOverdue = await prisma.invoice.findMany({
    where: { status: "OVERDUE" },
    include: { subscriber: true },
    orderBy: { totalAmount: "desc" },
    take: 5
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Dashboard Overview</h1>
      
      <div className={styles.grid}>
        <div className={`glass-panel ${styles.card}`}>
          <h3>Active Clients</h3>
          <p style={{ color: "var(--status-success)" }}>{activeClients}</p>
        </div>
        
        <div className={`glass-panel ${styles.card}`}>
          <h3>Frozen Clients</h3>
          <p style={{ color: "var(--status-warning)" }}>{freezeClients}</p>
        </div>
        
        <div className={`glass-panel ${styles.card}`}>
          <h3>Total Revenue (Collected)</h3>
          <p>Rp {totalCollected.toLocaleString("id-ID")}</p>
          <small style={{ color: "var(--text-muted)" }}>Target: Rp {totalInvoiced.toLocaleString("id-ID")}</small>
        </div>
        
        <div className={`glass-panel ${styles.card}`}>
          <h3>Collection Rate</h3>
          <p style={{ color: Number(collectionRate) > 80 ? "var(--status-success)" : "var(--status-danger)" }}>
            {collectionRate}%
          </p>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Top 5 Overdue Clients</h2>
        {topOverdue.length === 0 ? (
           <p style={{ color: "var(--text-muted)" }}>No overdue clients currently. Great job!</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Client</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Due Date</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Amount</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {topOverdue.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "0.75rem" }}>{inv.subscriber.name} <br/> <small style={{ color: "var(--text-muted)" }}>{inv.subscriber.phone}</small></td>
                  <td style={{ padding: "0.75rem" }}>{inv.dueDate.toLocaleDateString("id-ID")}</td>
                  <td style={{ padding: "0.75rem", color: "var(--status-danger)", fontWeight: 600 }}>Rp {inv.totalAmount.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <a href={`https://wa.me/${inv.subscriber.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>
                      Follow Up WA
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
