import { PrismaClient } from "@prisma/client";
import styles from "../dashboard.module.css";
import PrintButton from "@/components/PrintButton";

const prisma = new PrismaClient();

export default async function ReportsPage() {
  // Financial Data Aggregation
  const invoices = await prisma.invoice.findMany();
  
  let totalBilled = 0;
  let totalTax = 0;
  let totalCollected = 0;
  let overdueAmount = 0;
  
  let age0_7 = 0;
  let age8_14 = 0;
  let age15_30 = 0;
  let age30Plus = 0;

  const today = new Date();

  invoices.forEach(inv => {
    totalBilled += inv.totalAmount;
    totalTax += inv.taxAmount;
    
    if (inv.status === "PAID") {
      totalCollected += inv.totalAmount;
    }
    
    if (inv.status === "OVERDUE") {
      overdueAmount += inv.totalAmount;
      const diffTime = Math.abs(today.getTime() - inv.dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) age0_7++;
      else if (diffDays <= 14) age8_14++;
      else if (diffDays <= 30) age15_30++;
      else age30Plus++;
    }
  });

  return (
    <div className="animate-fade-in" id="report-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Financial & Insight Reports</h1>
        <PrintButton />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .btn-secondary, aside { display: none !important; }
          body, .mainContent { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
          .glass-panel { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
        }
      `}} />

      <div className={styles.grid}>
        {/* Revenue Report Card */}
        <div className={`glass-panel ${styles.card}`}>
          <h3>Total Revenue Billed</h3>
          <p>Rp {totalBilled.toLocaleString("id-ID")}</p>
        </div>
        <div className={`glass-panel ${styles.card}`}>
          <h3>Total Collected</h3>
          <p style={{ color: "var(--status-success)" }}>Rp {totalCollected.toLocaleString("id-ID")}</p>
        </div>
        <div className={`glass-panel ${styles.card}`}>
          <h3>Tax (PPN 11%) Collected</h3>
          <p style={{ color: "var(--accent-primary)" }}>Rp {totalTax.toLocaleString("id-ID")}</p>
        </div>
        <div className={`glass-panel ${styles.card}`}>
          <h3>Outstanding / Overdue</h3>
          <p style={{ color: "var(--status-danger)" }}>Rp {overdueAmount.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem" }}>
          Aging Report (Piutang)
        </h2>
        
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>0 - 7 Days</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>8 - 14 Days</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>15 - 30 Days</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--status-danger)" }}>&gt; 30 Days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>{age0_7} <small style={{fontSize:"0.875rem", fontWeight:400, color:"var(--text-muted)"}}>clients</small></td>
              <td style={{ padding: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>{age8_14} <small style={{fontSize:"0.875rem", fontWeight:400, color:"var(--text-muted)"}}>clients</small></td>
              <td style={{ padding: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>{age15_30} <small style={{fontSize:"0.875rem", fontWeight:400, color:"var(--text-muted)"}}>clients</small></td>
              <td style={{ padding: "1rem", fontSize: "1.25rem", fontWeight: 600, color: "var(--status-danger)" }}>{age30Plus} <small style={{fontSize:"0.875rem", fontWeight:400}}>clients</small></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
