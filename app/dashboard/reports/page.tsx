import styles from "../dashboard.module.css";
import PrintButton from "@/components/PrintButton";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  await requireUser(["SUPER_ADMIN", "BOD", "FINANCE"]);
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
    if (inv.status === "PAID") totalCollected += inv.totalAmount;
    if (inv.status === "OVERDUE") {
      overdueAmount += inv.totalAmount;
      const diffDays = Math.max(0, Math.ceil((today.getTime() - inv.dueDate.getTime()) / 86_400_000));
      if (diffDays <= 7) age0_7++;
      else if (diffDays <= 14) age8_14++;
      else if (diffDays <= 30) age15_30++;
      else age30Plus++;
    }
  });

  return (
    <div className="animate-fade-in" id="report-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}><h1 style={{ fontSize: "2rem" }}>Financial & Insight Reports</h1><PrintButton /></div>
      <style dangerouslySetInnerHTML={{__html: `@media print { .btn-secondary, aside { display:none!important; } body,.mainContent { background:white!important;color:black!important;padding:0!important;margin:0!important; } .glass-panel { box-shadow:none;border:1px solid #ccc;break-inside:avoid; } }`}} />
      <div className={styles.grid}>
        <div className={`glass-panel ${styles.card}`}><h3>Total Revenue Billed</h3><p>Rp {totalBilled.toLocaleString("id-ID")}</p></div>
        <div className={`glass-panel ${styles.card}`}><h3>Total Collected</h3><p>Rp {totalCollected.toLocaleString("id-ID")}</p></div>
        <div className={`glass-panel ${styles.card}`}><h3>PPN</h3><p>Rp {totalTax.toLocaleString("id-ID")}</p></div>
        <div className={`glass-panel ${styles.card}`}><h3>Outstanding / Overdue</h3><p>Rp {overdueAmount.toLocaleString("id-ID")}</p></div>
      </div>
      <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h2>Aging Report (Piutang)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}><thead><tr><th>0-7 Days</th><th>8-14 Days</th><th>15-30 Days</th><th>&gt;30 Days</th></tr></thead><tbody><tr><td>{age0_7}</td><td>{age8_14}</td><td>{age15_30}</td><td>{age30Plus}</td></tr></tbody></table>
      </div>
    </div>
  );
}
