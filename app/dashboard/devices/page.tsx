import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export default async function DevicesPage() {
  const devices = await prisma.device.findMany({
    include: { subscriber: true }
  });

  async function addDevice(formData: FormData) {
    "use server";
    const macAddress = formData.get("macAddress") as string;
    const serialNumber = formData.get("serialNumber") as string;
    const status = formData.get("status") as string;
    
    await prisma.device.create({
      data: { macAddress, serialNumber, status }
    });
    revalidatePath("/dashboard/devices");
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Master Data: Devices</h1>

      <div className={`glass-panel`} style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Add New Device</h2>
        <form action={addDevice} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>MAC Address</label>
            <input type="text" name="macAddress" required placeholder="00:1A:2B:3C:4D:5E" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Serial Number</label>
            <input type="text" name="serialNumber" required placeholder="SN-12345678" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Status</label>
            <select name="status" style={{ width: "100%" }}>
              <option value="IDLE">IDLE</option>
              <option value="IN_USE">IN_USE</option>
              <option value="FREEZE">FREEZE</option>
              <option value="BROKEN">BROKEN</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: "0.75rem 2rem" }}>Add</button>
        </form>
      </div>

      <div className={`glass-panel`} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>MAC Address</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Serial Number</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Status</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No devices found.</td>
              </tr>
            ) : (
              devices.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "1rem" }}>{d.macAddress}</td>
                  <td style={{ padding: "1rem" }}>{d.serialNumber}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      background: d.status === "IDLE" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                      color: d.status === "IDLE" ? "var(--status-success)" : "var(--text-primary)"
                    }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-muted)" }}>
                    {d.subscriber ? d.subscriber.name : "-"}
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
