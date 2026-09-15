"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password, twoFactorCode: requires2FA ? twoFactorCode : undefined }),
      });
      const data = await res.json();

      if (res.ok && data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }
      if (res.ok && data.redirect) {
        router.replace(data.redirect);
        router.refresh();
        return;
      }

      setError(data.error || "Login failed");
      setLoading(false);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.loginCard}`}>
        <div className={styles.header}>
          <h1>ISP Billing System</h1>
          <p>Authorized staff access only</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.loginCard} style={{ padding: 0, gap: "1rem" }}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" autoComplete="username" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} required disabled={requires2FA} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={requires2FA} />
          </div>

          {requires2FA && (
            <div className={styles.formGroup}>
              <label htmlFor="twoFactorCode">Authenticator Code</label>
              <input
                id="twoFactorCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
            </div>
          )}

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? "Verifying..." : requires2FA ? "Verify & Sign In" : "Sign In"}
          </button>

          {requires2FA && (
            <button type="button" className="btn-secondary" onClick={() => { setRequires2FA(false); setTwoFactorCode(""); setError(""); }}>
              Use another account
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
