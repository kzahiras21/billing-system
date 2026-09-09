import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export default async function SubscribersPage() {
  const subscribers = await prisma.subscriber.findMany({
    include: { product: true, device: true }
  });
  
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" } });
  const devices = await prisma.device.findMany({ where: { status: "IDLE" } });

  async function addSubscriber(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const whatsapp = formData.get("whatsapp") as string;
    const email = formData.get("email") as string;
    const address = formData.get("address") as string;
    const productId = formData.get("productId") as string;
    const deviceId = formData.get("deviceId") as string || null;
    
    // Create subscriber and update device status
    await prisma.$transaction(async (tx) => {
      const sub = await tx.subscriber.create({
        data: { name, phone, whatsapp, email, address, productId, deviceId: deviceId || undefined }
      });
      
      if (deviceId) {
        await tx.device.update({
          where: { id: deviceId },
          data: { status: "IN_USE" }
        });
      }
    });
    
    revalidatePath("/dashboard/subscribers");
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Subscriber Management</h1>

      <div className={`glass-panel`} style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Register New Subscriber</h2>
        <form action={addSubscriber} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Name</label>
            <input type="text" name="name" required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Email</label>
            <input type="email" name="email" required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Phone</label>
            <input type="text" name="phone" required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>WhatsApp</label>
            <input type="text" name="whatsapp" required style={{ width: "100%" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Address</label>
            <textarea name="address" required style={{ width: "100%" }} rows={2}></textarea>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Product/Package</label>
            <select name="productId" required style={{ width: "100%" }}>
              <option value="">Select Package</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} - Rp {p.basePrice.toLocaleString()}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Assign Device (Optional)</label>
            <select name="deviceId" style={{ width: "100%" }}>
              <option value="">No Device Yet</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.macAddress} (SN: {d.serialNumber})</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", textAlign: "right", marginTop: "1rem" }}>
            <button type="submit" className="btn-primary" style={{ padding: "0.75rem 3rem" }}>Register Subscriber</button>
          </div>
        </form>
      </div>

      <div className={`glass-panel`} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Name</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Package</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Device</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No subscribers found.</td>
              </tr>
            ) : (
              subscribers.map(sub => (
                <tr key={sub.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "1rem" }}>{sub.name}<br/><small style={{color:"var(--text-muted)"}}>{sub.whatsapp}</small></td>
                  <td style={{ padding: "1rem" }}>{sub.product.name}</td>
                  <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{sub.device ? sub.device.macAddress : "None"}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      background: sub.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      color: sub.status === "ACTIVE" ? "var(--status-success)" : "var(--status-warning)"
                    }}>
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
