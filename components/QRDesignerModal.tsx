"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { renderQR, QRDesign, defaultDesign, DotStyle, GradientDir, LogoMode } from "@/lib/qr-render";
import { supabase } from "@/lib/supabase";

const COLORS = ["#000000","#1a1a2e","#16213e","#0f3460","#533483","#7c6dfa","#e94560","#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ffffff","#f8f9fa","#495057","#c0392b","#e67e22","#27ae60","#2980b9"];
const DOT_STYLES: { v: DotStyle; label: string }[] = [
  { v: "square", label: "■ Square" },
  { v: "rounded", label: "⬛ Rounded" },
  { v: "circle", label: "● Circle" },
  { v: "diamond", label: "◆ Diamond" },
];
const GRAD_DIRS: { v: GradientDir; label: string }[] = [
  { v: "diagonal", label: "↘ Diagonal" },
  { v: "horizontal", label: "→ Horizontal" },
  { v: "vertical", label: "↓ Vertical" },
  { v: "radial", label: "◎ Radial" },
];
const LOGO_MODES: { v: LogoMode; label: string; desc: string; emoji: string }[] = [
  { v: "center", label: "Center Logo", desc: "Logo sits in the middle of the QR code", emoji: "🎯" },
  { v: "tinted", label: "Logo Tinted", desc: "Each QR dot takes on the color of the logo beneath it", emoji: "🎨" },
  { v: "immersed", label: "Logo Immersed", desc: "Logo shows through the QR — dots blend with logo colors", emoji: "✨" },
  { v: "shaped", label: "Logo Shaped", desc: "QR dots appear ONLY within the logo's visible area (needs PNG with transparent background)", emoji: "🔷" },
];

function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c} style={{ width: 22, height: 22, background: c, borderRadius: 4, border: value === c ? "2px solid #7c6dfa" : "1px solid #252535", cursor: "pointer", padding: 0, flexShrink: 0 }} />
        ))}
        <input type="color" value={value} onChange={e => onChange(e.target.value)} title="Custom color"
          style={{ width: 22, height: 22, border: "1px solid #252535", borderRadius: 4, cursor: "pointer", padding: 0, background: "none" }} />
      </div>
    </div>
  );
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, fontWeight: 700, marginBottom: 8, marginTop: 2 }}>{children}</div>;
}

function OptBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: active ? "1px solid #7c6dfa" : "1px solid #252535", background: active ? "rgba(124,109,250,.15)" : "#0c0c10", color: active ? "#a99dfc" : "#9898b0", whiteSpace: "nowrap" as const }}>
      {children}
    </button>
  );
}

export default function QRDesignerModal({ codeId, codeName, scanUrl, initialDesign, onClose, onSaved }: {
  codeId: string; codeName: string; scanUrl: string;
  initialDesign?: Partial<QRDesign>;
  onClose: () => void;
  onSaved: (design: QRDesign) => void;
}) {
  const [design, setDesign] = useState<QRDesign>({ ...defaultDesign, ...initialDesign });
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"brand" | "dots" | "corners" | "colors" | "frame">("brand");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const up = (patch: Partial<QRDesign>) => setDesign(d => ({ ...d, ...patch }));

  const rerender = useCallback(async () => {
    if (!canvasRef.current) return;
    setRendering(true);
    await renderQR(canvasRef.current, scanUrl, design, 320);
    setRendering(false);
  }, [scanUrl, design]);

  useEffect(() => { rerender(); }, [rerender]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { alert("Logo must be under 500KB"); return; }
    const reader = new FileReader();
    reader.onload = ev => up({ logo: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const download = async () => {
    if (!canvasRef.current) return;
    setRendering(true);
    await renderQR(canvasRef.current, scanUrl, design, 1200);
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `qr-${codeName}.png`;
    a.click();
    await renderQR(canvasRef.current, scanUrl, design, 320);
    setRendering(false);
  };

  const save = async () => {
    setSaving(true);
    await supabase.from("qr_codes").update({ design }).eq("id", codeId);
    setSaving(false);
    onSaved(design);
    onClose();
  };

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: tab === t ? "#252535" : "transparent", color: tab === t ? "#ededf5" : "#9898b0" }}>
      {label}
    </button>
  );

  const needsLogo = design.logoMode !== "center" || design.logo;

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.88)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}>
      <div style={{ background: "#14141c", border: "1px solid #252535", borderRadius: 16, width: "100%", maxWidth: 860, maxHeight: "97vh", display: "flex", flexDirection: "column" as const, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #252535", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🎨 QR Code Designer</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9898b0" }}>{codeName}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={download} style={{ background: "transparent", color: "#ededf5", border: "1px solid #252535", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>↓ 1200px PNG</button>
            <button onClick={save} disabled={saving} style={{ background: "#7c6dfa", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Saving..." : "✓ Save"}</button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#9898b0", cursor: "pointer", fontSize: 18, padding: "0 4px" }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>

          {/* Controls */}
          <div style={{ borderRight: "1px solid #252535", display: "flex", flexDirection: "column" as const, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 2, padding: "10px 14px", borderBottom: "1px solid #252535", flexWrap: "wrap" as const }}>
              {tabBtn("brand", "🔷 Brand QR")}
              {tabBtn("dots", "Dots")}
              {tabBtn("corners", "Corners")}
              {tabBtn("colors", "Colors")}
              {tabBtn("frame", "Frame")}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column" as const, gap: 18 }}>

              {/* ── BRAND QR TAB ── */}
              {tab === "brand" && (<>
                <div style={{ background: "linear-gradient(135deg, rgba(124,109,250,.12), rgba(233,69,96,.08))", border: "1px solid rgba(124,109,250,.25)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Make Your Logo the QR Code</div>
                  <div style={{ fontSize: 12, color: "#9898b0", lineHeight: 1.6 }}>Upload your logo below and choose how the QR code integrates with it. All modes remain fully scannable.</div>
                </div>

                {/* Logo upload */}
                <div>
                  <SecTitle>Upload Logo</SecTitle>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                  <button onClick={() => logoInputRef.current?.click()} style={{ width: "100%", background: "#0c0c10", border: "2px dashed " + (design.logo ? "#7c6dfa" : "#252535"), borderRadius: 10, padding: design.logo ? "12px" : "20px", color: design.logo ? "#a99dfc" : "#9898b0", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textAlign: "center" as const, transition: "border-color .2s" }}>
                    {design.logo ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img src={design.logo} alt="" style={{ width: 48, height: 48, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4 }} />
                        <div style={{ textAlign: "left" as const }}>
                          <div style={{ fontWeight: 700, color: "#ededf5", fontSize: 12 }}>Logo uploaded ✓</div>
                          <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>Click to change</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                        <div>Click to upload logo</div>
                        <div style={{ fontSize: 11, marginTop: 4, color: "#6b6880" }}>PNG, SVG, JPG — max 500KB<br/>For "Logo Shaped" mode, use PNG with transparent background</div>
                      </div>
                    )}
                  </button>
                  {design.logo && (
                    <button onClick={() => up({ logo: "", logoMode: "center" })} style={{ marginTop: 6, width: "100%", background: "none", border: "1px solid rgba(248,113,113,.3)", color: "#f87171", borderRadius: 6, padding: "6px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Remove logo</button>
                  )}
                </div>

                {/* Logo mode selector */}
                {design.logo && (<>
                  <div>
                    <SecTitle>Integration Mode</SecTitle>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                      {LOGO_MODES.map(mode => (
                        <button key={mode.v} onClick={() => up({ logoMode: mode.v })} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, border: design.logoMode === mode.v ? "1px solid #7c6dfa" : "1px solid #252535", background: design.logoMode === mode.v ? "rgba(124,109,250,.1)" : "#0c0c10", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit", transition: "all .15s" }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{mode.emoji}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: design.logoMode === mode.v ? "#a99dfc" : "#ededf5", marginBottom: 3 }}>{mode.label}</div>
                            <div style={{ fontSize: 11, color: "#9898b0", lineHeight: 1.5 }}>{mode.desc}</div>
                          </div>
                          {design.logoMode === mode.v && <span style={{ marginLeft: "auto", color: "#7c6dfa", fontSize: 14, flexShrink: 0 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo size (center mode only) */}
                  {design.logoMode === "center" && (<>
                    <div>
                      <SecTitle>Logo Size — {Math.round(design.logoSize * 100)}%</SecTitle>
                      <input type="range" min="15" max="35" value={Math.round(design.logoSize * 100)} onChange={e => up({ logoSize: Number(e.target.value) / 100 })} style={{ width: "100%", accentColor: "#7c6dfa" }} />
                    </div>
                    <ColorPicker label="Logo Background" value={design.logoBgColor} onChange={v => up({ logoBgColor: v })} />
                  </>)}
                </>)}

                {!design.logo && (
                  <div style={{ textAlign: "center" as const, padding: "20px 0", color: "#6b6880", fontSize: 12 }}>
                    Upload a logo above to unlock Brand QR modes
                  </div>
                )}
              </>)}

              {/* ── DOTS TAB ── */}
              {tab === "dots" && (<>
                <SecTitle>Dot Shape</SecTitle>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {DOT_STYLES.map(s => <OptBtn key={s.v} active={design.dotStyle === s.v} onClick={() => up({ dotStyle: s.v })}>{s.label}</OptBtn>)}
                </div>
              </>)}

              {/* ── CORNERS TAB ── */}
              {tab === "corners" && (<>
                <SecTitle>Corner Square Style</SecTitle>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {DOT_STYLES.filter(s => s.v !== "diamond").map(s => <OptBtn key={s.v} active={design.cornerSquareStyle === s.v} onClick={() => up({ cornerSquareStyle: s.v })}>{s.label}</OptBtn>)}
                </div>
                <SecTitle>Corner Dot Style</SecTitle>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  {DOT_STYLES.filter(s => s.v !== "diamond").map(s => <OptBtn key={s.v} active={design.cornerDotStyle === s.v} onClick={() => up({ cornerDotStyle: s.v })}>{s.label}</OptBtn>)}
                </div>
              </>)}

              {/* ── COLORS TAB ── */}
              {tab === "colors" && (<>
                <ColorPicker label="Dot Color" value={design.dotColor} onChange={v => up({ dotColor: v })} />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <SecTitle>Gradient Second Color</SecTitle>
                    {design.dotColor2 && <button onClick={() => up({ dotColor2: "" })} style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer", marginTop: -2 }}>Remove</button>}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
                    {COLORS.map(c => <button key={c} onClick={() => up({ dotColor2: c })} style={{ width: 22, height: 22, background: c, borderRadius: 4, border: design.dotColor2 === c ? "2px solid #7c6dfa" : "1px solid #252535", cursor: "pointer", padding: 0 }} />)}
                    <input type="color" value={design.dotColor2 || "#000000"} onChange={e => up({ dotColor2: e.target.value })} style={{ width: 22, height: 22, border: "1px solid #252535", borderRadius: 4, cursor: "pointer", padding: 0 }} />
                  </div>
                </div>
                {design.dotColor2 && (<>
                  <SecTitle>Gradient Direction</SecTitle>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    {GRAD_DIRS.map(d => <OptBtn key={d.v} active={design.gradientDir === d.v} onClick={() => up({ gradientDir: d.v })}>{d.label}</OptBtn>)}
                  </div>
                </>)}
                <ColorPicker label="Background Color" value={design.bgColor} onChange={v => up({ bgColor: v })} />
              </>)}

              {/* ── FRAME TAB ── */}
              {tab === "frame" && (<>
                <SecTitle>Label Text</SecTitle>
                <input value={design.frameLabel} onChange={e => up({ frameLabel: e.target.value })} placeholder="e.g. Scan me! · www.yoursite.com"
                  style={{ background: "#0c0c10", border: "1px solid #252535", borderRadius: 8, color: "#ededf5", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }} />
                {design.frameLabel && <ColorPicker label="Label Color" value={design.frameLabelColor} onChange={v => up({ frameLabelColor: v })} />}
              </>)}
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 28, gap: 14, background: "#0c0c10", overflow: "auto" }}>
            <div style={{ fontSize: 11, color: "#9898b0", textTransform: "uppercase" as const, letterSpacing: 1, fontWeight: 600 }}>Live Preview</div>
            <div style={{ background: "#1a1a26", border: "1px solid #252535", borderRadius: 16, padding: 20, boxShadow: "0 20px 80px rgba(0,0,0,.7)", position: "relative" as const }}>
              {rendering && (
                <div style={{ position: "absolute" as const, inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,20,28,.6)", borderRadius: 16, zIndex: 1 }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #1a1a26", borderTopColor: "#7c6dfa", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: "block", borderRadius: 8, maxWidth: "100%", maxHeight: "60vh" }} />
            </div>
            <div style={{ textAlign: "center" as const, maxWidth: 260 }}>
              {design.logoMode === "shaped" && design.logo && (
                <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#fbbf24", lineHeight: 1.6 }}>
                  💡 <strong>Tip:</strong> Logo Shaped works best with a PNG that has a transparent background and solid, clear shapes.
                </div>
              )}
              {!design.logo && (
                <p style={{ fontSize: 11, color: "#6b6880", lineHeight: 1.6 }}>
                  Use the <strong style={{ color: "#a99dfc" }}>🔷 Brand QR</strong> tab to embed your logo into the QR design.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
