"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { supabase, QRCode, UserPlan, PLAN_LIMITS } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import QRCard from "@/components/QRCard";
import CreateModal from "@/components/CreateModal";
import DetailPanel from "@/components/DetailPanel";
import styles from "./dashboard.module.css";

const AUTO_REFRESH_SECS = 30;
const ADMIN_EMAIL = "alhazayed@gmail.com";

function DashboardInner() {
  const [codes, setCodes] = useState<QRCode[]>([]);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<QRCode | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "err" } | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const user = session.user;
    setUserEmail(user.email || "");
    setIsAdmin(user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    const [codesRes, planRes] = await Promise.all([
      supabase.from("qr_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("user_plans").select("*").eq("user_id", user.id).single(),
    ]);
    if (codesRes.data) {
      setCodes(codesRes.data as QRCode[]);
      setSelected(prev => prev ? (codesRes.data!.find((c: QRCode) => c.id === prev.id) || prev) : null);
    }
    if (planRes.data) setUserPlan(planRes.data as UserPlan);
    setLoading(false); setRefreshing(false); setLastRefreshed(new Date()); setCountdown(AUTO_REFRESH_SECS);
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (searchParams.get("upgraded")) { showToast("🎉 Plan upgraded successfully!"); router.replace("/dashboard"); }
  }, [searchParams, router]);

  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => setCountdown(prev => {
      if (prev <= 1) { fetchAll(true); return AUTO_REFRESH_SECS; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [loading, fetchAll]);

  useEffect(() => {
    const ch = supabase.channel("qr_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "qr_codes" }, () => fetchAll(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleUpgrade = async (plan: string) => {
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleManageBilling = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleCreated = (code: QRCode) => {
    setCodes(prev => [code, ...prev]); setSelected(code);
    setShowCreate(false); setShowMobileSidebar(false);
    showToast("QR code created!");
  };

  const handleDeleted = (id: string) => {
    setCodes(prev => prev.filter(c => c.id !== id)); setSelected(null); showToast("Deleted.", "err");
  };

  const plan = userPlan?.plan || "free";
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const atCodeLimit = !isAdmin && limits.codes !== Infinity && codes.length >= limits.codes;
  const totalScans = codes.reduce((s, c) => s + (c.total_scans || 0), 0);
  const timeAgo = () => {
    const s = Math.round((new Date().getTime() - lastRefreshed.getTime()) / 1000);
    return s < 5 ? "just now" : `${s}s ago`;
  };

  // Sidebar content — shared between desktop sidebar and mobile drawer
  const SidebarContent = () => (
    <>
      <div className={styles.overallStats}>
        <div className={styles.overallStat}>
          <span className={styles.overallNum} style={{ color: "var(--accent-light)" }}>{codes.length}</span>
          <span className={styles.overallLabel}>QR Codes</span>
        </div>
        <div className={styles.overallStat}>
          <span className={styles.overallNum} style={{ color: "var(--green)" }}>{totalScans}</span>
          <span className={styles.overallLabel}>Total Scans</span>
        </div>
      </div>

      {/* Refresh */}
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 10, color: "var(--fg2)", textTransform: "uppercase" as const, letterSpacing: 1, fontWeight: 600 }}>Auto Refresh</span>
          <button onClick={() => fetchAll()} disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: refreshing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: refreshing ? 0.7 : 1 }}>
            <span style={{ display: "inline-block", animation: refreshing ? "spin .7s linear infinite" : "none" }}>↻</span>
            {refreshing ? "..." : "Now"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "var(--fg2)" }}>Next <span style={{ color: "var(--accent-light)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{countdown}s</span></span>
          <span style={{ fontSize: 10, color: "#6b6880" }}>{timeAgo()}</span>
        </div>
        <div style={{ background: "var(--border)", borderRadius: 99, height: 3, overflow: "hidden" }}>
          <div style={{ background: "var(--accent)", height: "100%", width: `${(countdown / AUTO_REFRESH_SECS) * 100}%`, borderRadius: 99, transition: "width 1s linear" }} />
        </div>
      </div>

      {/* Plan — only for non-admin */}
      {!isAdmin && (
        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--fg2)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 2 }}>Plan</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: plan === "pro" ? "var(--yellow)" : plan === "starter" ? "var(--accent-light)" : "var(--fg)" }}>{limits.label}</div>
          </div>
          {plan === "free" && <button onClick={() => handleUpgrade("starter")} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Upgrade</button>}
          {plan !== "free" && <button onClick={handleManageBilling} style={{ background: "transparent", color: "var(--fg2)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Manage</button>}
        </div>
      )}

      <button className={styles.createBtn} onClick={() => { setShowMobileSidebar(false); atCodeLimit ? handleUpgrade(plan === "free" ? "starter" : "pro") : setShowCreate(true); }}>
        {atCodeLimit ? "⬡ Upgrade for More" : "＋ New QR Code"}
      </button>

      <nav className={styles.nav}>
        <div className={styles.navLabel}>Your Codes</div>
        {loading ? (
          <div className={styles.navSkeleton}>{[1,2,3].map(i => <div key={i} className={styles.navSkeletonItem} />)}</div>
        ) : codes.length === 0 ? (
          <p className={styles.navEmpty}>No codes yet</p>
        ) : codes.map(code => (
          <button key={code.id} className={`${styles.navItem} ${selected?.id === code.id ? styles.navItemActive : ""}`}
            onClick={() => { setSelected(code); setShowMobileSidebar(false); }}>
            <span className={styles.navItemDot} />
            <span className={styles.navItemName}>{code.name}</span>
            <span className={styles.navItemCount}>{code.total_scans}</span>
          </button>
        ))}
      </nav>

      <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--fg2)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{userEmail}</div>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--fg2)", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>Sign Out</button>
      </div>
    </>
  );

  return (
    <div className={styles.root}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span className={styles.logoMark}>⬡</span>QR<strong>Track</strong></div>
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className={styles.mobileBar}>
        <div style={{ fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#7c6dfa" }}>⬡</span>QRTrack
          {isAdmin && <span style={{ background: "rgba(251,191,36,.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.3)", borderRadius: 5, padding: "1px 7px", fontSize: 9, fontWeight: 700 }}>ADMIN</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selected && (
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg2)", borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
          )}
          <button onClick={() => fetchAll()} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg)", borderRadius: 6, padding: "7px 10px", fontSize: 13, cursor: "pointer" }}>↻</button>
          <button onClick={() => { atCodeLimit ? handleUpgrade(plan === "free" ? "starter" : "pro") : setShowCreate(true); }}
            style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>＋ New</button>
          <button onClick={() => setShowMobileSidebar(v => !v)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg)", borderRadius: 6, padding: "7px 10px", fontSize: 16, cursor: "pointer" }}>☰</button>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {showMobileSidebar && (
        <div style={{ position: "fixed" as const, inset: 0, zIndex: 50 }}>
          <div onClick={() => setShowMobileSidebar(false)} style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute" as const, top: 0, left: 0, bottom: 0, width: 280, background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column" as const, gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div className={styles.logo}><span className={styles.logoMark}>⬡</span>QR<strong>Track</strong></div>
              <button onClick={() => setShowMobileSidebar(false)} style={{ background: "none", border: "none", color: "var(--fg2)", fontSize: 20, cursor: "pointer", padding: "0 4px" }}>✕</button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={styles.main}>
        {selected ? (
          <DetailPanel code={selected} onDeleted={handleDeleted} onRefresh={() => fetchAll(true)} showToast={showToast} />
        ) : (
          <div className={styles.mainEmpty}>
            {loading ? <div className={styles.spinner} /> : codes.length === 0 ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 64, marginBottom: 16, filter: "grayscale(1) opacity(.3)" }}>⬛</div>
                <h2 style={{ fontSize: 22, marginBottom: 8 }}>No QR codes yet</h2>
                <p style={{ color: "var(--fg2)", marginBottom: 24, fontSize: 14 }}>Create your first trackable QR code.</p>
                <button className={styles.createBtn} style={{ width: "auto", padding: "12px 24px" }} onClick={() => setShowCreate(true)}>＋ Create QR Code</button>
              </div>
            ) : (
              <div style={{ width: "100%", maxWidth: 900, padding: "24px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 800 }}>All QR Codes</h1>
                    <div style={{ fontSize: 11, color: "var(--fg2)", marginTop: 2 }}>{refreshing ? <span style={{ color: "var(--accent-light)" }}>Refreshing...</span> : `Updated ${timeAgo()}`}</div>
                  </div>
                  <button onClick={() => fetchAll()} disabled={refreshing}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid var(--border2)", color: "var(--fg)", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ animation: refreshing ? "spin .7s linear infinite" : "none", display: "inline-block" }}>↻</span> Refresh
                  </button>
                </div>
                {atCodeLimit && (
                  <div style={{ background: "rgba(124,109,250,.1)", border: "1px solid rgba(124,109,250,.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 13 }}>You reached the <strong>{limits.codes} code limit</strong> on {limits.label} plan.</div>
                    <button onClick={() => handleUpgrade(plan === "free" ? "starter" : "pro")} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Upgrade</button>
                  </div>
                )}
                <div className={styles.grid}>
                  {codes.map((code, i) => <QRCard key={code.id} code={code} delay={i * 0.05} onClick={() => setSelected(code)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} showToast={showToast} />}
      {toast && <div className={styles.toast} style={{ background: toast.type === "err" ? "var(--red)" : "var(--accent)" }}>{toast.msg}</div>}
    </div>
  );
}

export default function Dashboard() {
  return <Suspense><DashboardInner /></Suspense>;
}
