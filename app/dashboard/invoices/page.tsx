import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import PrintButton from "@/components/PrintButton";

const prisma = new PrismaClient();

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { subscriber: true },
    orderBy: { createdAt: "desc" }
  });

  async function triggerGenerate() {
    "use server";
    // For manual triggering during dev
    await fetch("http://localhost:3000/api/cron/generate-invoices", { method: "POST" });
    revalidatePath("/dashboard/invoices");
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .btn-primary, .btn-secondary, aside { display: none !important; }
          body, .mainContent { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
          .glass-panel { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
        }
      `}} />
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Invoices & Billing</h1>
        <form action={triggerGenerate}>
          <button type="submit" className="btn-primary" style={{marginRight: "1rem"}}>Generate Invoices (Cron Manual Trigger)</button>
          <PrintButton label="Print Invoices PDF" />
        </form>
      </div>

      <div className={`glass-panel`} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Client</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Amount (Inc. PPN)</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Due Date</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Status</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Payment Details</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No invoices found.</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "1rem" }}>
                    {inv.subscriber?.name || "Unknown"}<br/>
                    <small style={{ color: "var(--text-muted)" }}>{inv.subscriber?.phone || ""}</small>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "600" }}>Rp {inv.totalAmount.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "1rem" }}>{inv.dueDate.toLocaleDateString("id-ID")}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      background: inv.status === "PAID" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: inv.status === "PAID" ? "var(--status-success)" : "var(--status-danger)"
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    VA: {inv.virtualAccount || "-"}<br/>
                    <a href={`/dashboard/invoices/${inv.id}`} className="btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}>Lihat / Print PDF</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
