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

const features = [
  { icon: "⬡", title: "Trackable QR Codes", desc: "Every scan is recorded instantly. See who scanned, when, and from where." },
  { icon: "🌍", title: "Works Worldwide", desc: "Scans from any phone anywhere in the world count in real time." },
  { icon: "📊", title: "Live Analytics", desc: "Dashboard updates the moment a scan happens. No refresh needed." },
  { icon: "🔒", title: "Private and Secure", desc: "Your data is yours. Each account sees only their own codes and scans." },
];

export default function Landing() {
  return (
    <div style={{ background: "#0c0c10", minHeight: "100vh", color: "#ededf5", fontFamily: "Syne, sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #1a1a28", background: "#0c0c10" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: 20 }}>
          <span style={{ color: "#7c6dfa", fontSize: 26 }}>⬡</span>QR<strong>Track</strong>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/pricing" style={{ color: "#9898b0", fontSize: 14, textDecoration: "none" }}>Pricing</Link>
          <Link href="/login" style={{ color: "#9898b0", fontSize: 14, textDecoration: "none" }}>Sign In</Link>
          <Link href="/register" style={{ background: "#7c6dfa", color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Get Started</Link>
        </div>
      </nav>

      <section style={{ textAlign: "center", padding: "100px 40px 80px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "inline-block", background: "rgba(124,109,250,.15)", color: "#a99dfc", border: "1px solid rgba(124,109,250,.3)", borderRadius: 99, padding: "6px 16px", fontSize: 12, fontWeight: 700, marginBottom: 28, letterSpacing: 1, textTransform: "uppercase" as const }}>
          QR Code Analytics Platform
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 24 }}>
          Know exactly who scans<br /><span style={{ color: "#7c6dfa" }}>your QR codes</span>
        </h1>
        <p style={{ fontSize: 18, color: "#9898b0", lineHeight: 1.7, marginBottom: 40 }}>
          Generate trackable QR codes and watch every scan appear in real time with country, device, and timestamp data.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/register" style={{ background: "#7c6dfa", color: "#fff", padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>Start for free</Link>
          <Link href="/pricing" style={{ background: "transparent", color: "#ededf5", padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: "none", border: "1px solid #252535" }}>See pricing</Link>
        </div>
        <p style={{ color: "#6b6880", fontSize: 13, marginTop: 16 }}>No credit card required</p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "20px 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
              <div style={{ color: "#9898b0", fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px 100px" }}>
        <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Simple pricing</h2>
        <p style={{ textAlign: "center", color: "#9898b0", marginBottom: 48, fontSize: 15 }}>Start free, upgrade when you need more</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {plans.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? "rgba(124,109,250,.08)" : "#14141c", border: "1px solid " + (plan.highlight ? "#7c6dfa" : "#252535"), borderRadius: 14, padding: 28, display: "flex", flexDirection: "column" as const, position: "relative" as const }}>
              {plan.highlight && (
                <div style={{ position: "absolute" as const, top: -12, left: "50%", transform: "translateX(-50%)", background: "#7c6dfa", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 99, textTransform: "uppercase" as const, letterSpacing: 1, whiteSpace: "nowrap" as const }}>
                  Most Popular
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ color: "#9898b0", fontSize: 13, marginBottom: 20 }}>{plan.desc}</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>
                {plan.price === 0 ? "Free" : "$" + plan.price}<span style={{ fontSize: 16, fontWeight: 400, color: "#9898b0" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column" as const, gap: 10, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "#34d399", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} style={{ display: "block", textAlign: "center" as const, textDecoration: "none", background: plan.highlight ? "#7c6dfa" : "transparent", color: plan.highlight ? "#fff" : "#ededf5", border: plan.highlight ? "none" : "1px solid #252535", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14 }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #1a1a28", padding: "28px 40px", textAlign: "center" as const, color: "#6b6880", fontSize: 13 }}>
        2026 QRTrack
      </footer>
    </div>
  );
}
