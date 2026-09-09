import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import styles from "./dashboard.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  // Basic middleware check (ideally done in middleware.ts)
  if (!token) {
    redirect("/");
  }

  return (
    <div className={styles.layout}>
      <aside className={`glass-panel ${styles.sidebar}`}>
        <h2>ISP Billing</h2>
        <nav>
          <a href="/dashboard" className={styles.navLink}>Dashboard</a>
          <a href="/dashboard/subscribers" className={styles.navLink}>Subscribers</a>
          <a href="/dashboard/products" className={styles.navLink}>Products</a>
          <a href="/dashboard/devices" className={styles.navLink}>Devices</a>
          <a href="/dashboard/invoices" className={styles.navLink}>Invoices</a>
          <a href="/dashboard/reports" className={styles.navLink}>Reports</a>
          <a href="/dashboard/audit-logs" className={styles.navLink}>Audit Logs</a>
        </nav>
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
