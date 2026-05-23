"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, QRCode, Scan } from "@/lib/supabase";
import { QRDesign, defaultDesign, renderQR } from "@/lib/qr-render";
import dynamic from "next/dynamic";
import styles from "./DetailPanel.module.css";

const QRDesignerModal = dynamic(() => import("./QRDesignerModal"), { ssr: false });

function getScanUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/api/scan/${id}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function BarChart({ scans, days = 30 }: { scans: Scan[]; days?: number }) {
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    buckets[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
  }
  scans.forEach(s => {
    const k = new Date(s.scanned_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (k in buckets) buckets[k]++;
  });
  const entries = Object.entries(buckets);
  const max = Math.max(...entries.map(e => e[1]), 1);
  return (
    <div className={styles.chart}>
      {entries.map(([label, val], i) => (
        <div key={label} className={styles.chartCol}>
          <div className={styles.chartBarWrap}>
            <div title={`${label}: ${val}`} className={styles.chartBar}
              style={{ height: `${(val / max) * 100}%`, minHeight: val ? 4 : 2, opacity: val ? 1 : 0.25 }} />
          </div>
          {(i === 0 || i === Math.floor(entries.length / 2) || i === entries.length - 1) && (
            <span className={styles.chartLabel}>{label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ scans }: { scans: Scan[] }) {
  const hours = Array(24).fill(0);
  scans.forEach(s => { hours[new Date(s.scanned_at).getHours()]++; });
  const max = Math.max(...hours, 1);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 48 }}>
      {hours.map((v, h) => (
        <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div title={`${h}:00 — ${v}`} style={{ width: "100%", background: v ? `rgba(124,109,250,${0.2 + (v / max) * 0.8})` : "var(--border)", borderRadius: 2, height: 32, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
            <div style={{ width: "100%", background: "var(--accent)", height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
          </div>
          {h % 6 === 0 && <span style={{ fontSize: 7, color: "var(--fg2)" }}>{h}h</span>}
        </div>
      ))}
    </div>
  );
}

export default function DetailPanel({ code, onDeleted, onRefresh, showToast }: {
  code: QRCode; onDeleted: (id: string) => void;
  onRefresh: () => void; showToast: (msg: string, type?: "ok" | "err") => void;
}) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);
  const [design, setDesign] = useState<QRDesign>({ ...defaultDesign, ...(code as any).design });
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanUrl = getScanUrl(code.id);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchScans = useCallback(async () => {
    const { data } = await supabase.from("scans").select("*").eq("qr_code_id", code.id).order("scanned_at", { ascending: false }).limit(500);
    setScans((data as Scan[]) || []);
    setLoading(false);
  }, [code.id]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const size = isMobile ? 130 : 200;
    renderQR(canvasRef.current, scanUrl, design, size);
  }, [scanUrl, design, isMobile]);

  useEffect(() => {
    const ch = supabase.channel(`scans_${code.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scans", filter: `qr_code_id=eq.${code.id}` },
        (payload) => { setScans(prev => [payload.new as Scan, ...prev]); onRefresh(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [code.id, onRefresh]);

  const copyUrl = () => { navigator.clipboard.writeText(scanUrl); showToast("Copied!"); };
  const downloadQR = async () => {
    const c = document.createElement("canvas");
    await renderQR(c, scanUrl, design, 1200);
    const a = document.createElement("a"); a.href = c.toDataURL("image/png");
    a.download = `qr-${code.name}.png`; a.click();
  };
  const deleteCode = async () => {
    if (!confirm(`Delete "${code.name}"?`)) return;
    await supabase.from("qr_codes").delete().eq("id", code.id);
    onDeleted(code.id);
  };

  const now = new Date();
  const today = scans.filter(s => new Date(s.scanned_at).toDateString() === now.toDateString()).length;
  const week  = scans.filter(s => now.getTime() - new Date(s.scanned_at).getTime() < 7 * 86400000).length;
  const month = scans.filter(s => now.getTime() - new Date(s.scanned_at).getTime() < 30 * 86400000).length;

  const countryMap: Record<string, number> = {};
  scans.forEach(s => { const c = s.country || "Unknown"; countryMap[c] = (countryMap[c] || 0) + 1; });
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const deviceMap: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
  scans.forEach(s => {
    const ua = (s.user_agent || "").toLowerCase();
    if (/tablet|ipad/.test(ua)) deviceMap.Tablet++;
    else if (/mobile|android|iphone/.test(ua)) deviceMap.Mobile++;
    else deviceMap.Desktop++;
  });

  const hourMap = Array(24).fill(0);
  scans.forEach(s => { hourMap[new Date(s.scanned_at).getHours()]++; });
  const peakHour = hourMap.indexOf(Math.max(...hourMap));

  const dayMap: Record<string, number> = {};
  scans.forEach(s => { const d = new Date(s.scanned_at).toLocaleDateString("en-US", { weekday: "long" }); dayMap[d] = (dayMap[d] || 0) + 1; });
  const bestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const last7 = scans.filter(s => now.getTime() - new Date(s.scanned_at).getTime() < 7 * 86400000).length;
  const prev7 = scans.filter(s => { const d = now.getTime() - new Date(s.scanned_at).getTime(); return d >= 7 * 86400000 && d < 14 * 86400000; }).length;
  const velocityChange = prev7 > 0 ? (((last7 - prev7) / prev7) * 100).toFixed(0) : null;

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div>
            <h1 className={styles.title}>{code.name}</h1>
            <a href={code.destination_url} target="_blank" rel="noreferrer" className={styles.destUrl}>{code.destination_url} ↗</a>
          </div>
          <button className={styles.deleteBtn} onClick={deleteCode}>🗑 Delete</button>
        </div>

        <div className={styles.body}>
          {/* Left: QR */}
          <div className={styles.qrSection}>
            <div className={styles.qrBox}>
              <canvas ref={canvasRef} style={{ display: "block", borderRadius: 4 }} />
            </div>

            {/* Mobile: actions next to QR */}
            <div className={isMobile ? styles.qrMobileActions : ""} style={!isMobile ? { display: "flex", flexDirection: "column", gap: 10, width: "100%" } : {}}>
              {/* Customize — most prominent button */}
              <button className={styles.customizeBtn} onClick={() => setShowDesigner(true)}>
                🎨 Customize Design
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={styles.btnPrimary} onClick={downloadQR}>↓ Download</button>
                <button className={styles.btnSecondary} onClick={copyUrl}>⧉ Copy URL</button>
              </div>
              <div className={styles.scanUrlBox}>
                <div className={styles.scanUrlLabel}>Scan URL</div>
                <div className={styles.scanUrl}>{scanUrl}</div>
              </div>
              {!isMobile && <div className={styles.meta}>Created {fmtDate(code.created_at)}</div>}
            </div>
          </div>

          {/* Right: Stats */}
          <div className={styles.statsSection}>
            {/* KPIs */}
            <div className={styles.statCards}>
              {[
                { label: "Total Scans", value: code.total_scans, color: "var(--accent-light)" },
                { label: "This Month", value: month, color: "var(--green)" },
                { label: "This Week", value: week, color: "var(--yellow)" },
                { label: "Today", value: today, color: "var(--red)" },
              ].map(s => (
                <div key={s.label} className={styles.statCard}>
                  <div className={styles.statNum} style={{ color: s.color }}>{s.value}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Insights */}
            {scans.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Peak Hour", value: `${peakHour}:00`, icon: "⏰" },
                  { label: "Best Day", value: bestDay.slice(0, 3), icon: "📅" },
                  { label: "Top Country", value: topCountries[0]?.[0] || "—", icon: "🌍" },
                  { label: "Week Trend", value: velocityChange ? (Number(velocityChange) >= 0 ? "▲ " : "▼ ") + Math.abs(Number(velocityChange)) + "%" : "—", icon: "📈", color: velocityChange && Number(velocityChange) >= 0 ? "var(--green)" : "var(--red)" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: 16 }}>{s.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: (s as any).color || "var(--fg)", margin: "3px 0 2px", fontFamily: "var(--font-mono)" }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: "var(--fg2)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 30-day chart */}
            <div className={styles.chartCard}>
              <div className={styles.cardTitle}>Scans — Last 30 Days</div>
              <BarChart scans={scans} days={30} />
            </div>

            {/* Analytics row */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
              <div className={styles.chartCard}>
                <div className={styles.cardTitle}>By Hour of Day</div>
                {scans.length === 0 ? <p className={styles.logEmpty}>No data yet</p> : <HourlyChart scans={scans} />}
              </div>
              <div className={styles.chartCard}>
                <div className={styles.cardTitle}>Top Countries</div>
                {topCountries.length === 0 ? <p className={styles.logEmpty}>No data yet</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {topCountries.map(([c, v]) => (
                      <div key={c}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                          <span>{c}</span><span style={{ color: "var(--fg2)", fontFamily: "var(--font-mono)" }}>{v}</span>
                        </div>
                        <div style={{ background: "var(--border)", borderRadius: 3, height: 4 }}>
                          <div style={{ background: "var(--accent)", height: "100%", width: `${(v / scans.length) * 100}%`, borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.chartCard}>
                <div className={styles.cardTitle}>Device Type</div>
                {scans.length === 0 ? <p className={styles.logEmpty}>No data yet</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(deviceMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([d, v]) => {
                      const icons: Record<string, string> = { Mobile: "📱", Desktop: "🖥️", Tablet: "📲" };
                      const colors: Record<string, string> = { Mobile: "var(--green)", Desktop: "var(--accent)", Tablet: "var(--yellow)" };
                      return (
                        <div key={d}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span>{icons[d]} {d}</span><span style={{ color: "var(--fg2)", fontFamily: "var(--font-mono)" }}>{((v / scans.length) * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ background: "var(--border)", borderRadius: 3, height: 5 }}>
                            <div style={{ background: colors[d], height: "100%", width: `${(v / scans.length) * 100}%`, borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Scan log */}
            <div className={styles.logCard}>
              <div className={styles.cardTitle}>
                Recent Scans
                {scans.length > 0 && <span className={styles.logCount}>{scans.length}</span>}
              </div>
              {loading ? <p className={styles.logEmpty}>Loading...</p>
                : scans.length === 0 ? <p className={styles.logEmpty}>No scans yet — share your QR code! 🚀</p>
                : (
                  <div className={styles.log}>
                    {scans.slice(0, 50).map((s, i) => (
                      <div key={s.id} className={styles.logRow}>
                        <span className={styles.logIdx}>#{scans.length - i}</span>
                        <div className={styles.logInfo}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span className={styles.logTime}>{fmtTime(s.scanned_at)}</span>
                            {s.country && <span className={styles.logBadge}>{s.country}</span>}
                          </div>
                          {s.user_agent && <div className={styles.logUa}>{s.user_agent.slice(0, 80)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {showDesigner && (
        <QRDesignerModal
          codeId={code.id} codeName={code.name} scanUrl={scanUrl}
          initialDesign={design} onClose={() => setShowDesigner(false)}
          onSaved={(d) => { setDesign(d); showToast("Design saved!"); }}
        />
      )}
    </div>
  );
}
