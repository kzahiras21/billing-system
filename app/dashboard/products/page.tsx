import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import styles from "../dashboard.module.css";

const prisma = new PrismaClient();

export default async function ProductsPage() {
  const products = await prisma.product.findMany();

  async function addProduct(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const basePrice = Number(formData.get("basePrice"));
    const status = formData.get("status") as string;
    
    await prisma.product.create({
      data: { name, basePrice, status }
    });
    revalidatePath("/dashboard/products");
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>Master Data: Products</h1>

      <div className={`glass-panel`} style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Add New Product</h2>
        <form action={addProduct} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Name</label>
            <input type="text" name="name" required placeholder="e.g. 50 Mbps Fiber" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Base Price (Rp)</label>
            <input type="number" name="basePrice" required placeholder="e.g. 350000" style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Status</label>
            <select name="status" style={{ width: "100%" }}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: "0.75rem 2rem" }}>Add</button>
        </form>
      </div>

      <div className={`glass-panel`} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Name</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Price (Rp)</th>
              <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No products found.</td>
              </tr>
            ) : (
              products.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "1rem" }}>{p.name}</td>
                  <td style={{ padding: "1rem" }}>{p.basePrice.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      background: p.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: p.status === "ACTIVE" ? "var(--status-success)" : "var(--status-danger)"
                    }}>
                      {p.status}
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
