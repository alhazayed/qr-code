"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "free";

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err || !data.session) {
      setError(err?.message || "Signup failed — try signing in if you already have an account.");
      setLoading(false); return;
    }
    // Supabase persists session in localStorage automatically
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.session.access_token }),
    });
    if (plan !== "free") {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) { window.location.href = url; return; }
    }
    router.push("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0c10", fontFamily: "Syne, sans-serif" }}>
      <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 14, padding: 40, width: 380, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 32, color: "#7c6dfa" }}>⬡</div>
            <h1 style={{ color: "#ededf5", fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>QRTrack</h1>
          </Link>
          <p style={{ color: "#9898b0", fontSize: 13, margin: 0 }}>
            Create your {plan === "free" ? "free" : plan.charAt(0).toUpperCase() + plan.slice(1)} account
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            style={{ background: "#0c0c10", border: "1px solid #252535", borderRadius: 8, color: "#ededf5", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          <input type="password" placeholder="Password (min 6 characters)" value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            style={{ background: "#0c0c10", border: "1px solid " + (error ? "#f87171" : "#252535"), borderRadius: 8, color: "#ededf5", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
        </div>
        {error && <p style={{ color: "#f87171", fontSize: 12, margin: "-8px 0" }}>{error}</p>}
        <button onClick={submit} disabled={loading}
          style={{ background: "#7c6dfa", color: "#fff", border: "none", borderRadius: 8, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Creating account..." : plan === "free" ? "Create Free Account" : "Continue to Payment"}
        </button>
        <p style={{ textAlign: "center", color: "#9898b0", fontSize: 13, margin: 0 }}>
          Have an account? <Link href="/login" style={{ color: "#7c6dfa", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  return <Suspense><RegisterForm /></Suspense>;
}
