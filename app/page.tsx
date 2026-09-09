"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requires2FA) {
          // Future 2FA implementation
          router.push(`/verify-2fa?userId=${data.userId}`);
        } else {
          router.push(data.redirect);
        }
      } else {
        setError(data.error || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.loginCard}`}>
        <div className={styles.header}>
          <h1>ISP Billing System</h1>
          <p>Sign in to manage your network</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.loginCard} style={{ padding: 0, gap: '1rem' }}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <a href="#" className={styles.forgotPassword}>Forgot password?</a>
          </div>

          <button
            type="submit"
            className={`btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
