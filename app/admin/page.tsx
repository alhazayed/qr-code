"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRow = {
  user_id: string; email: string; plan: string;
  scan_count_this_month: number; total_codes: number;
  stripe_subscription_id: string | null;
  created_at: string; last_sign_in_at: string | null;
};
type Scan = { scanned_at: string; country: string | null; user_agent: string | null; qr_code_id: string; };
type QRCode = { id: string; user_id: string; name: string; total_scans: number; created_at: string; destination_url: string; };

function Sparkline({ data, color = "#7c6dfa" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: v ? color : "#1c1c28", borderRadius: 2, height: `${Math.max((v / max) * 100, v ? 8 : 3)}%`, opacity: 0.5 + (i / data.length) * 0.5 }} />
      ))}
    </div>
  );
}

function KPI({ label, value, sub, color, trend }: { label: string; value: string | number; sub?: string; color?: string; trend?: number[]; }) {
  return (
    <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#ededf5", fontFamily: "IBM Plex Mono, monospace", lineHeight: 1, marginBottom: sub ? 4 : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9898b0", marginBottom: trend ? 8 : 0 }}>{sub}</div>}
      {trend && <Sparkline data={trend} color={color || "#7c6dfa"} />}
    </div>
  );
}

function Badge({ plan, onChange }: { plan: string; onChange?: (p: string) => void }) {
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    pro:     { bg: "rgba(251,191,36,.12)",   color: "#fbbf24", border: "rgba(251,191,36,.3)" },
    starter: { bg: "rgba(124,109,250,.12)",  color: "#a99dfc", border: "rgba(124,109,250,.3)" },
    free:    { bg: "rgba(255,255,255,.05)",  color: "#9898b0", border: "#252535" },
  };
  const c = cfg[plan] || cfg.free;
  if (!onChange) return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}>{plan}</span>
  );
  return (
    <select value={plan} onChange={e => onChange(e.target.value)}
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" as const, outline: "none" }}>
      <option value="free" style={{ background: "#14141c", color: "#9898b0" }}>FREE</option>
      <option value="starter" style={{ background: "#14141c", color: "#a99dfc" }}>STARTER</option>
      <option value="pro" style={{ background: "#14141c", color: "#fbbf24" }}>PRO</option>
    </select>
  );
}

const TH = { padding: "10px 16px", textAlign: "left" as const, color: "#9898b0", fontWeight: 600, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1, borderBottom: "1px solid #252535", whiteSpace: "nowrap" as const };
const TD = { padding: "12px 16px", fontSize: 13, borderBottom: "1px solid #1a1a28" };

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [codes, setCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users" | "scans" | "codes">("overview");
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const [usersRes, scansRes, codesRes] = await Promise.all([
      supabase.rpc("admin_get_users"),
      supabase.from("scans").select("scanned_at,country,user_agent,qr_code_id").order("scanned_at", { ascending: false }).limit(2000),
      supabase.from("qr_codes").select("id,user_id,name,total_scans,created_at,destination_url").order("total_scans", { ascending: false }),
    ]);

    setUsers((usersRes.data || []) as UserRow[]);
    setScans((scansRes.data || []) as Scan[]);
    setCodes((codesRes.data || []) as QRCode[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const updatePlan = async (userId: string, plan: string) => {
    setUpdatingPlan(userId);
    const res = await fetch("/api/admin/update-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, plan }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan } : u));
      showToast(`Plan updated to ${plan}`);
    } else {
      showToast("Update failed");
    }
    setUpdatingPlan(null);
  };

  // Computed stats
  const now = new Date();
  const freeCount = users.filter(u => u.plan === "free").length;
  const starterCount = users.filter(u => u.plan === "starter").length;
  const proCount = users.filter(u => u.plan === "pro").length;
  const mrr = starterCount * 9 + proCount * 29;
  const convRate = users.length > 0 ? (((starterCount + proCount) / users.length) * 100).toFixed(1) : "0";
  const newThisWeek = users.filter(u => (now.getTime() - new Date(u.created_at).getTime()) < 7 * 86400000).length;
  const scansToday = scans.filter(s => new Date(s.scanned_at).toDateString() === now.toDateString()).length;

  const signupsByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return users.filter(u => new Date(u.created_at).toDateString() === d.toDateString()).length;
  });
  const scansByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return scans.filter(s => new Date(s.scanned_at).toDateString() === d.toDateString()).length;
  });
  const mrrTrend = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const u = users.filter(u => new Date(u.created_at) <= d);
    return u.filter(u => u.plan === "starter").length * 9 + u.filter(u => u.plan === "pro").length * 29;
  });

  const countryMap: Record<string, number> = {};
  scans.forEach(s => { const c = s.country || "Unknown"; countryMap[c] = (countryMap[c] || 0) + 1; });
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const deviceMap = { Mobile: 0, Desktop: 0, Tablet: 0 };
  scans.forEach(s => {
    const ua = (s.user_agent || "").toLowerCase();
    if (/tablet|ipad/.test(ua)) deviceMap.Tablet++;
    else if (/mobile|android|iphone/.test(ua)) deviceMap.Mobile++;
    else deviceMap.Desktop++;
  });

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: tab === t ? "#252535" : "transparent", color: tab === t ? "#ededf5" : "#9898b0" }}>
      {label}
    </button>
  );

  return (
    <div style={{ background: "#0c0c10", minHeight: "100vh", color: "#ededf5", fontFamily: "Syne, sans-serif" }}>
      {/* Topbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: "1px solid #1a1a28", background: "#14141c", position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#7c6dfa" }}>⬡</span>QRTrack
          </div>
          <span style={{ background: "rgba(251,191,36,.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.3)", borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>SUPER ADMIN</span>
          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
            {tabBtn("overview", "Overview")}
            {tabBtn("users", "Users")}
            {tabBtn("scans", "Scans")}
            {tabBtn("codes", "QR Codes")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "1px solid #252535", color: "#9898b0", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>My Dashboard</button>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #252535", color: "#9898b0", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9898b0" }}>Loading analytics...</div>
        ) : (<>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 28 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Business Overview</h1>
                <p style={{ color: "#9898b0", fontSize: 13 }}>Real-time metrics across all users and QR codes</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12 }}>
                <KPI label="Monthly Revenue" value={"$" + mrr} sub={"ARR: $" + (mrr * 12).toLocaleString()} color="#34d399" trend={mrrTrend} />
                <KPI label="Total Users" value={users.length} sub={newThisWeek + " new this week"} color="#a99dfc" trend={signupsByDay} />
                <KPI label="Conversion Rate" value={convRate + "%"} sub={(starterCount + proCount) + " paid users"} color="#fbbf24" />
                <KPI label="Total Scans" value={scans.length.toLocaleString()} sub={scansToday + " today"} color="#7c6dfa" trend={scansByDay} />
                <KPI label="QR Codes" value={codes.length} sub={codes.length > 0 ? (codes.reduce((s, c) => s + c.total_scans, 0) / codes.length).toFixed(1) + " avg scans" : "0 avg"} color="#f87171" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Plan split */}
                <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 18 }}>Plan Distribution</div>
                  {[
                    { label: "Free", count: freeCount, color: "#9898b0", rev: 0 },
                    { label: "Starter ($9/mo)", count: starterCount, color: "#a99dfc", rev: starterCount * 9 },
                    { label: "Pro ($29/mo)", count: proCount, color: "#fbbf24", rev: proCount * 29 },
                  ].map(p => (
                    <div key={p.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>
                        <span style={{ color: "#9898b0" }}>{p.count} users{p.rev > 0 ? ` · $${p.rev}/mo` : ""}</span>
                      </div>
                      <div style={{ background: "#0c0c10", borderRadius: 4, height: 8 }}>
                        <div style={{ background: p.color, height: "100%", width: users.length > 0 ? `${(p.count / users.length) * 100}%` : "0%", borderRadius: 4, transition: "width .5s" }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top countries */}
                <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 18 }}>Top Scan Countries</div>
                  {topCountries.length === 0 ? <p style={{ color: "#9898b0", fontSize: 13 }}>No scan data yet</p> : topCountries.map(([c, v]) => (
                    <div key={c} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span>{c}</span><span style={{ color: "#9898b0", fontFamily: "IBM Plex Mono, monospace" }}>{v} ({scans.length > 0 ? ((v / scans.length) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div style={{ background: "#0c0c10", borderRadius: 4, height: 5 }}><div style={{ background: "#7c6dfa", height: "100%", width: `${(v / scans.length) * 100}%`, borderRadius: 4 }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device + Top Codes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 18 }}>Device Breakdown</div>
                  {scans.length === 0 ? <p style={{ color: "#9898b0", fontSize: 13 }}>No data yet</p> : Object.entries(deviceMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([d, v]) => {
                    const icons: Record<string, string> = { Mobile: "📱", Desktop: "🖥️", Tablet: "📲" };
                    const colors: Record<string, string> = { Mobile: "#34d399", Desktop: "#7c6dfa", Tablet: "#fbbf24" };
                    return (
                      <div key={d} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span>{icons[d]} {d}</span><span style={{ color: "#9898b0" }}>{((v / scans.length) * 100).toFixed(1)}%</span></div>
                        <div style={{ background: "#0c0c10", borderRadius: 4, height: 6 }}><div style={{ background: colors[d], height: "100%", width: `${(v / scans.length) * 100}%`, borderRadius: 4 }} /></div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 18 }}>Top QR Codes</div>
                  {codes.slice(0, 6).map((c, i) => (
                    <div key={c.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a28", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#6b6880", minWidth: 20, fontFamily: "IBM Plex Mono, monospace" }}>#{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "#9898b0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{c.destination_url}</div>
                      </div>
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: "#a99dfc", fontWeight: 700 }}>{c.total_scans}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>All Users</h1>
                  <p style={{ color: "#9898b0", fontSize: 13 }}>{users.length} accounts · Change plans using the dropdown</p>
                </div>
                <button onClick={fetchAll} style={{ background: "none", border: "1px solid #252535", color: "#9898b0", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Refresh</button>
              </div>
              <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" as const }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                    <thead>
                      <tr>{["Email", "Plan", "QR Codes", "Scans/Mo", "Revenue", "Last Active", "Joined"].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={7} style={{ ...TD, textAlign: "center" as const, color: "#9898b0", padding: "40px" }}>No users yet</td></tr>
                      ) : users.map(u => (
                        <tr key={u.user_id} style={{ opacity: updatingPlan === u.user_id ? 0.5 : 1, transition: "opacity .2s" }}>
                          <td style={{ ...TD, fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>
                            <div>{u.email}</div>
                            <div style={{ fontSize: 10, color: "#6b6880", marginTop: 2 }}>{u.user_id.slice(0, 12)}...</div>
                          </td>
                          <td style={TD}>
                            <Badge plan={u.plan} onChange={(p) => updatePlan(u.user_id, p)} />
                          </td>
                          <td style={{ ...TD, fontFamily: "IBM Plex Mono, monospace", textAlign: "center" as const }}>{u.total_codes}</td>
                          <td style={{ ...TD, fontFamily: "IBM Plex Mono, monospace", textAlign: "center" as const }}>{u.scan_count_this_month.toLocaleString()}</td>
                          <td style={{ ...TD, fontFamily: "IBM Plex Mono, monospace", color: u.plan !== "free" ? "#34d399" : "#9898b0" }}>
                            {u.plan === "starter" ? "$9/mo" : u.plan === "pro" ? "$29/mo" : "$0"}
                          </td>
                          <td style={{ ...TD, color: "#9898b0", fontSize: 11 }}>
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}
                          </td>
                          <td style={{ ...TD, color: "#9898b0", fontSize: 11 }}>
                            {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SCANS ── */}
          {tab === "scans" && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Scan Analytics</h1>
              <p style={{ color: "#9898b0", fontSize: 13, marginBottom: 24 }}>{scans.length.toLocaleString()} total scans</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                <KPI label="Total Scans" value={scans.length.toLocaleString()} color="#7c6dfa" />
                <KPI label="Today" value={scansToday} color="#34d399" />
                <KPI label="This Week" value={scansByDay.slice(-7).reduce((a, b) => a + b, 0)} color="#fbbf24" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 16 }}>Country Breakdown</div>
                  {topCountries.length === 0 ? <p style={{ color: "#9898b0", fontSize: 13 }}>No data</p> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
                      <thead><tr>{["Country", "Scans", "Share"].map(h => <th key={h} style={{ ...TH, padding: "8px 10px" }}>{h}</th>)}</tr></thead>
                      <tbody>{topCountries.map(([c, v]) => (
                        <tr key={c}>
                          <td style={{ ...TD, padding: "10px 10px" }}>{c}</td>
                          <td style={{ ...TD, padding: "10px 10px", fontFamily: "IBM Plex Mono, monospace" }}>{v.toLocaleString()}</td>
                          <td style={{ ...TD, padding: "10px 10px", color: "#9898b0" }}>{((v / scans.length) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
                <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 16 }}>Device Type</div>
                  {scans.length === 0 ? <p style={{ color: "#9898b0", fontSize: 13 }}>No data</p> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
                      <thead><tr>{["Device", "Scans", "Share"].map(h => <th key={h} style={{ ...TH, padding: "8px 10px" }}>{h}</th>)}</tr></thead>
                      <tbody>{Object.entries(deviceMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([d, v]) => (
                        <tr key={d}>
                          <td style={{ ...TD, padding: "10px 10px" }}>{d}</td>
                          <td style={{ ...TD, padding: "10px 10px", fontFamily: "IBM Plex Mono, monospace" }}>{v.toLocaleString()}</td>
                          <td style={{ ...TD, padding: "10px 10px", color: "#9898b0" }}>{((v / scans.length) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CODES ── */}
          {tab === "codes" && (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>All QR Codes</h1>
              <p style={{ color: "#9898b0", fontSize: 13, marginBottom: 20 }}>{codes.length} codes across all users</p>
              <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" as const }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                    <thead><tr>{["Name", "Owner", "Destination", "Scans", "Created"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {codes.map(c => {
                        const owner = users.find(u => u.user_id === c.user_id);
                        return (
                          <tr key={c.id}>
                            <td style={{ ...TD, fontWeight: 600, maxWidth: 200 }}>{c.name}</td>
                            <td style={{ ...TD, fontSize: 11, color: "#9898b0", fontFamily: "IBM Plex Mono, monospace" }}>{owner?.email || c.user_id.slice(0, 12) + "..."}</td>
                            <td style={{ ...TD, fontSize: 11, color: "#9898b0", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{c.destination_url}</td>
                            <td style={{ ...TD, fontFamily: "IBM Plex Mono, monospace", color: "#a99dfc", fontWeight: 700 }}>{c.total_scans.toLocaleString()}</td>
                            <td style={{ ...TD, color: "#9898b0", fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>)}
      </div>

      {toast && (
        <div style={{ position: "fixed" as const, bottom: 24, right: 24, background: "#7c6dfa", color: "#fff", borderRadius: 10, padding: "12px 20px", fontWeight: 700, fontSize: 13, boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
