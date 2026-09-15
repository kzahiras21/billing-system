import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function DevicesPage() {
  await requireUser();
  const devices = await prisma.device.findMany({ include: { subscriber: true }, orderBy: { createdAt: "desc" } });

  async function addDevice(formData: FormData) {
    "use server";
    const actor = await requireUser(["SUPER_ADMIN"]);
    const macAddress = clean(formData.get("macAddress"), 32).toUpperCase();
    const serialNumber = clean(formData.get("serialNumber"), 100);
    const status = clean(formData.get("status"), 20);
    const validMac = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddress);
    if (!validMac || !serialNumber || !["IDLE", "IN_USE", "FREEZE", "BROKEN"].includes(status)) {
      throw new Error("Invalid device data");
    }

    const device = await prisma.device.create({ data: { macAddress, serialNumber, status } });
    await prisma.auditLog.create({
      data: {
        action: "DEVICE_CREATED",
        entity: "Device",
        entityId: device.id,
        newValue: JSON.stringify({ macAddress, serialNumber, status }),
        actorId: actor.id,
        actorRole: actor.role,
      },
    });
    revalidatePath("/dashboard/devices");
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Master Data: Devices</h1>
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Add New Device</h2>
        <form action={addDevice} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}><label>MAC Address</label><input type="text" name="macAddress" maxLength={17} required placeholder="00:1A:2B:3C:4D:5E" style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: "200px" }}><label>Serial Number</label><input type="text" name="serialNumber" maxLength={100} required style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: "150px" }}><label>Status</label><select name="status" style={{ width: "100%" }}><option value="IDLE">IDLE</option><option value="IN_USE">IN_USE</option><option value="FREEZE">FREEZE</option><option value="BROKEN">BROKEN</option></select></div>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ padding: "1rem", textAlign: "left" }}>MAC</th><th style={{ padding: "1rem", textAlign: "left" }}>Serial</th><th style={{ padding: "1rem", textAlign: "left" }}>Status</th><th style={{ padding: "1rem", textAlign: "left" }}>Assigned Site</th></tr></thead>
          <tbody>{devices.map(d => <tr key={d.id} style={{ borderTop: "1px solid var(--glass-border)" }}><td style={{ padding: "1rem" }}>{d.macAddress}</td><td style={{ padding: "1rem" }}>{d.serialNumber}</td><td style={{ padding: "1rem" }}>{d.status}</td><td style={{ padding: "1rem" }}>{d.subscriber ? (d.subscriber.siteName || d.subscriber.name) : "-"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
