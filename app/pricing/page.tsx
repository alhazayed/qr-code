"use client";
import Link from "next/link";

const plans = [
  {
    name: "Free", price: 0, period: "",
    desc: "Perfect for trying things out",
    features: ["3 QR codes", "500 scans / month", "Basic scan stats", "PNG download"],
    cta: "Get Started Free", href: "/register", highlight: false,
  },
  {
    name: "Starter", price: 9, period: "/mo",
    desc: "For small businesses and creators",
    features: ["25 QR codes", "10,000 scans / month", "Full scan analytics", "Country and device tracking", "Real-time dashboard"],
    cta: "Start Starter", href: "/register?plan=starter", highlight: true,
  },
  {
    name: "Pro", price: 29, period: "/mo",
    desc: "For agencies and power users",
    features: ["Unlimited QR codes", "Unlimited scans", "Full scan analytics", "Country and device tracking", "Real-time dashboard", "Priority support"],
    cta: "Start Pro", href: "/register?plan=pro", highlight: false,
  },
];

export default function Pricing() {
  return (
    <div style={{ background: "#0c0c10", minHeight: "100vh", color: "#ededf5", fontFamily: "Syne, sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #1a1a28", background: "#0c0c10" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 20, textDecoration: "none", color: "#ededf5" }}>
          <span style={{ color: "#7c6dfa", fontSize: 26 }}>⬡</span>QR<strong>Track</strong>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/login" style={{ color: "#9898b0", fontSize: 14, textDecoration: "none" }}>Sign In</Link>
          <Link href="/register" style={{ background: "#7c6dfa", color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Get Started</Link>
        </div>
      </nav>
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "80px 40px 100px" }}>
        <h1 style={{ textAlign: "center", fontSize: 42, fontWeight: 800, marginBottom: 12 }}>Simple pricing</h1>
        <p style={{ textAlign: "center", color: "#9898b0", marginBottom: 60, fontSize: 16 }}>Start free, upgrade when you need more. No hidden fees.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {plans.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? "rgba(124,109,250,.08)" : "#14141c", border: "1px solid " + (plan.highlight ? "#7c6dfa" : "#252535"), borderRadius: 14, padding: 32, display: "flex", flexDirection: "column" as const, position: "relative" as const }}>
              {plan.highlight && (
                <div style={{ position: "absolute" as const, top: -13, left: "50%", transform: "translateX(-50%)", background: "#7c6dfa", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 16px", borderRadius: 99, textTransform: "uppercase" as const, letterSpacing: 1, whiteSpace: "nowrap" as const }}>Most Popular</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{plan.name}</div>
              <div style={{ color: "#9898b0", fontSize: 14, marginBottom: 24 }}>{plan.desc}</div>
              <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 28 }}>
                {plan.price === 0 ? "Free" : "$" + plan.price}<span style={{ fontSize: 18, fontWeight: 400, color: "#9898b0" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column" as const, gap: 12, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, fontSize: 14 }}>
                    <span style={{ color: "#34d399", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} style={{ display: "block", textAlign: "center" as const, textDecoration: "none", background: plan.highlight ? "#7c6dfa" : "transparent", color: plan.highlight ? "#fff" : "#ededf5", border: plan.highlight ? "none" : "1px solid #252535", borderRadius: 8, padding: "14px 0", fontWeight: 700, fontSize: 15 }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 48, color: "#6b6880", fontSize: 13 }}>
          All plans include a 14-day free trial on paid features. Cancel anytime.
        </div>
      </section>
    </div>
  );
}
