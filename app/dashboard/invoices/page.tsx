import { revalidatePath } from "next/cache";
import PrintButton from "@/components/PrintButton";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateMonthlyInvoices } from "@/lib/invoice-generator";

export default async function InvoicesPage() {
  await requireUser(["SUPER_ADMIN", "FINANCE", "BOD"]);

  const invoices = await prisma.invoice.findMany({
    include: { subscriber: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  async function triggerGenerate() {
    "use server";
    const actor = await requireUser(["SUPER_ADMIN", "FINANCE"]);
    const result = await generateMonthlyInvoices();
    await prisma.auditLog.create({
      data: {
        action: "MANUAL_GENERATE_INVOICE",
        entity: "System",
        entityId: "ManualBillingRun",
        newValue: JSON.stringify(result),
        actorId: actor.id,
        actorRole: actor.role,
      },
    });
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
            <button type="submit" className="btn-primary" style={{marginRight: "1rem"}}>Generate Current Month</button>
            <PrintButton label="Print Invoices PDF" />
          </form>
        </div>

        <div className="glass-panel" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ padding: "1rem", textAlign: "left" }}>Customer / Site</th><th style={{ padding: "1rem", textAlign: "left" }}>Period</th><th style={{ padding: "1rem", textAlign: "left" }}>Amount (Inc. PPN)</th><th style={{ padding: "1rem", textAlign: "left" }}>Due Date</th><th style={{ padding: "1rem", textAlign: "left" }}>Status</th><th style={{ padding: "1rem", textAlign: "left" }}>Payment</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "1rem" }}>{inv.subscriber.customer?.name || inv.subscriber.name}<br/><small>{inv.subscriber.siteName || inv.subscriber.address}</small></td>
                  <td style={{ padding: "1rem" }}>{String(inv.billingMonth).padStart(2, "0")}/{inv.billingYear}</td>
                  <td style={{ padding: "1rem", fontWeight: 600 }}>Rp {inv.totalAmount.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "1rem" }}>{inv.dueDate.toLocaleDateString("id-ID")}</td>
                  <td style={{ padding: "1rem" }}>{inv.status}</td>
                  <td style={{ padding: "1rem", fontSize: "0.875rem" }}>VA: {inv.virtualAccount || "-"}<br/><a href={`/dashboard/invoices/${inv.id}`} className="btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}>View / Print</a></td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center" }}>No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
