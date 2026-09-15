import styles from "./dashboard.module.css";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className={styles.layout}>
      <aside className={`glass-panel ${styles.sidebar}`}>
        <h2>ISP Billing</h2>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          {user.name} · {user.role}
        </p>
        <nav>
          <a href="/dashboard" className={styles.navLink}>Dashboard</a>
          <a href="/dashboard/subscribers" className={styles.navLink}>Subscribers</a>
          <a href="/dashboard/products" className={styles.navLink}>Products</a>
          <a href="/dashboard/devices" className={styles.navLink}>Devices</a>
          <a href="/dashboard/invoices" className={styles.navLink}>Invoices</a>
          <a href="/dashboard/reports" className={styles.navLink}>Reports</a>
          {(user.role === "SUPER_ADMIN" || user.role === "BOD") && (
            <a href="/dashboard/audit-logs" className={styles.navLink}>Audit Logs</a>
          )}
        </nav>
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
