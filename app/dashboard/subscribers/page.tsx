import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addDays, addMonths, TRIAL_DAYS, MIN_CONTRACT_MONTHS } from "@/lib/billing";

function clean(value: FormDataEntryValue | null, max = 255) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function SubscribersPage() {
  await requireUser();

  const subscribers = await prisma.subscriber.findMany({
    include: { product: true, device: true, customer: true },
    orderBy: { createdAt: "desc" },
  });
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" } });
  const devices = await prisma.device.findMany({ where: { status: "IDLE" } });
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });

  async function addSubscriber(formData: FormData) {
    "use server";
    const actor = await requireUser(["SUPER_ADMIN", "MARKETING"]);

    const existingCustomerId = clean(formData.get("customerId"), 100);
    const name = clean(formData.get("name"), 160);
    const siteName = clean(formData.get("siteName"), 160);
    const phone = clean(formData.get("phone"), 40);
    const whatsapp = clean(formData.get("whatsapp"), 40);
    const email = clean(formData.get("email"), 254).toLowerCase();
    const address = clean(formData.get("address"), 500);
    const productId = clean(formData.get("productId"), 100);
    const deviceId = clean(formData.get("deviceId"), 100) || null;
    const registrationFee = Math.max(0, Math.round(Number(formData.get("registrationFee") || 0)));

    if (!productId || !address || (!existingCustomerId && (!name || !email || !phone || !whatsapp))) {
      throw new Error("Invalid subscriber data");
    }

    const product = await prisma.product.findFirst({ where: { id: productId, status: "ACTIVE" } });
    if (!product) throw new Error("Selected product is not available");

    await prisma.$transaction(async (tx) => {
      const customer = existingCustomerId
        ? await tx.customer.findUnique({ where: { id: existingCustomerId } })
        : await tx.customer.create({
            data: { name, phone, whatsapp, email, marketingId: actor.role === "MARKETING" ? actor.id : null },
          });

      if (!customer) throw new Error("Customer not found");

      const sub = await tx.subscriber.create({
        data: {
          customerId: customer.id,
          name: customer.name,
          siteName: siteName || address,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          address,
          status: "PENDING_INSTALLATION",
          productId,
          deviceId: deviceId || undefined,
          agreedMonthlyPrice: product.basePrice,
          registrationFee,
          marketingId: actor.role === "MARKETING" ? actor.id : customer.marketingId,
        },
      });

      if (deviceId) {
        await tx.device.updateMany({
          where: { id: deviceId, status: "IDLE" },
          data: { status: "IN_USE" },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "SUBSCRIBER_CREATED",
          entity: "Subscriber",
          entityId: sub.id,
          newValue: JSON.stringify({ customerId: customer.id, productId, siteName, status: sub.status }),
          actorId: actor.id,
          actorRole: actor.role,
        },
      });
    });

    revalidatePath("/dashboard/subscribers");
  }

  async function startTrial(formData: FormData) {
    "use server";
    const actor = await requireUser(["SUPER_ADMIN"]);
    const id = clean(formData.get("id"), 100);
    const startsAt = new Date();
    const trialEndsAt = addDays(startsAt, TRIAL_DAYS);

    const updated = await prisma.subscriber.updateMany({
      where: { id, status: "PENDING_INSTALLATION" },
      data: { status: "TRIAL", trialEndsAt },
    });
    if (updated.count !== 1) throw new Error("Subscriber is not ready for trial");

    await prisma.auditLog.create({
      data: {
        action: "TRIAL_STARTED",
        entity: "Subscriber",
        entityId: id,
        newValue: JSON.stringify({ trialEndsAt }),
        actorId: actor.id,
        actorRole: actor.role,
      },
    });
    revalidatePath("/dashboard/subscribers");
  }

  async function activateService(formData: FormData) {
    "use server";
    const actor = await requireUser(["SUPER_ADMIN"]);
    const id = clean(formData.get("id"), 100);
    const subscriber = await prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber || subscriber.status !== "TRIAL" || !subscriber.trialEndsAt || subscriber.trialEndsAt > new Date()) {
      throw new Error("Three-day trial must be completed before activation");
    }

    const activationDate = new Date();
    const contractEndsAt = addMonths(activationDate, MIN_CONTRACT_MONTHS);
    await prisma.$transaction([
      prisma.subscriber.update({
        where: { id },
        data: {
          status: "ACTIVE",
          activationDate,
          contractStartsAt: activationDate,
          contractEndsAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "SUBSCRIBER_ACTIVATED",
          entity: "Subscriber",
          entityId: id,
          newValue: JSON.stringify({ activationDate, contractEndsAt }),
          actorId: actor.id,
          actorRole: actor.role,
        },
      }),
    ]);
    revalidatePath("/dashboard/subscribers");
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Customer & Service Sites</h1>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Register Service Site</h2>
        <form action={addSubscriber} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Existing Customer (optional)</label>
            <select name="customerId" style={{ width: "100%" }}>
              <option value="">Create new customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}
            </select>
          </div>
          <div><label>Customer Name</label><input type="text" name="name" maxLength={160} style={{ width: "100%" }} /></div>
          <div><label>Site Name</label><input type="text" name="siteName" maxLength={160} placeholder="HQ / Branch Bekasi" style={{ width: "100%" }} /></div>
          <div><label>Email</label><input type="email" name="email" maxLength={254} style={{ width: "100%" }} /></div>
          <div><label>Phone</label><input type="text" name="phone" maxLength={40} style={{ width: "100%" }} /></div>
          <div><label>WhatsApp</label><input type="text" name="whatsapp" maxLength={40} style={{ width: "100%" }} /></div>
          <div><label>Registration Fee (Rp)</label><input type="number" name="registrationFee" min="0" step="1" defaultValue="0" style={{ width: "100%" }} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Installation Address</label><textarea name="address" required maxLength={500} style={{ width: "100%" }} rows={2} /></div>
          <div>
            <label>Product/Package</label>
            <select name="productId" required style={{ width: "100%" }}>
              <option value="">Select Package</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} - Rp {p.basePrice.toLocaleString("id-ID")}</option>)}
            </select>
          </div>
          <div>
            <label>Assign Device (Optional)</label>
            <select name="deviceId" style={{ width: "100%" }}>
              <option value="">No Device Yet</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.macAddress} (SN: {d.serialNumber})</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}><button type="submit" className="btn-primary">Register</button></div>
        </form>
      </div>

      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ padding: "1rem", textAlign: "left" }}>Customer / Site</th><th style={{ padding: "1rem", textAlign: "left" }}>Package</th><th style={{ padding: "1rem", textAlign: "left" }}>Status</th><th style={{ padding: "1rem", textAlign: "left" }}>Contract</th><th style={{ padding: "1rem", textAlign: "left" }}>Action</th></tr></thead>
          <tbody>
            {subscribers.map(sub => (
              <tr key={sub.id} style={{ borderTop: "1px solid var(--glass-border)" }}>
                <td style={{ padding: "1rem" }}>{sub.customer?.name || sub.name}<br/><small>{sub.siteName || sub.address}</small></td>
                <td style={{ padding: "1rem" }}>{sub.product.name}<br/><small>Rp {(sub.agreedMonthlyPrice ?? sub.product.basePrice).toLocaleString("id-ID")}/bln</small></td>
                <td style={{ padding: "1rem" }}>{sub.status}{sub.trialEndsAt && sub.status === "TRIAL" ? <><br/><small>until {sub.trialEndsAt.toLocaleDateString("id-ID")}</small></> : null}</td>
                <td style={{ padding: "1rem" }}>{sub.activationDate ? sub.activationDate.toLocaleDateString("id-ID") : "-"}<br/><small>{sub.contractEndsAt ? `min. until ${sub.contractEndsAt.toLocaleDateString("id-ID")}` : ""}</small></td>
                <td style={{ padding: "1rem" }}>
                  {sub.status === "PENDING_INSTALLATION" && <form action={startTrial}><input type="hidden" name="id" value={sub.id}/><button className="btn-secondary" type="submit">Start 3-day Trial</button></form>}
                  {sub.status === "TRIAL" && <form action={activateService}><input type="hidden" name="id" value={sub.id}/><button className="btn-primary" type="submit">Activate</button></form>}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center" }}>No service sites found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
