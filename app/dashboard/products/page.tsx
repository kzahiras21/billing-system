import { revalidatePath } from "next/cache";
import styles from "../dashboard.module.css";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function ProductsPage() {
  await requireUser();
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  async function addProduct(formData: FormData) {
    "use server";
    const actor = await requireUser(["SUPER_ADMIN"]);
    const name = String(formData.get("name") || "").trim().slice(0, 160);
    const basePrice = Math.round(Number(formData.get("basePrice")));
    const status = String(formData.get("status") || "ACTIVE");
    if (!name || !Number.isSafeInteger(basePrice) || basePrice < 0 || !["ACTIVE", "INACTIVE"].includes(status)) {
      throw new Error("Invalid product data");
    }

    const product = await prisma.product.create({ data: { name, basePrice, status } });
    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_CREATED",
        entity: "Product",
        entityId: product.id,
        newValue: JSON.stringify({ name, basePrice, status }),
        actorId: actor.id,
        actorRole: actor.role,
      },
    });
    revalidatePath("/dashboard/products");
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Master Data: Products</h1>
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Add New Product</h2>
        <form action={addProduct} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}><label>Name</label><input type="text" name="name" maxLength={160} required style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: "150px" }}><label>Base Price (Rp, excl. PPN)</label><input type="number" name="basePrice" min="0" step="1" required style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: "150px" }}><label>Status</label><select name="status" style={{ width: "100%" }}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ padding: "1rem", textAlign: "left" }}>Name</th><th style={{ padding: "1rem", textAlign: "left" }}>Price excl. PPN</th><th style={{ padding: "1rem", textAlign: "left" }}>Status</th></tr></thead>
          <tbody>{products.map(p => <tr key={p.id} style={{ borderTop: "1px solid var(--glass-border)" }}><td style={{ padding: "1rem" }}>{p.name}</td><td style={{ padding: "1rem" }}>Rp {p.basePrice.toLocaleString("id-ID")}</td><td style={{ padding: "1rem" }}>{p.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
