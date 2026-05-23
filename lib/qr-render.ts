export type DotStyle = "square" | "rounded" | "circle" | "diamond";
export type GradientDir = "diagonal" | "vertical" | "horizontal" | "radial";
export type LogoMode = "center" | "tinted" | "shaped" | "immersed";

export type QRDesign = {
  dotColor: string;
  dotColor2: string;
  gradientDir: GradientDir;
  bgColor: string;
  dotStyle: DotStyle;
  cornerDotStyle: DotStyle;
  cornerSquareStyle: DotStyle;
  logo: string;
  logoMode: LogoMode;
  logoSize: number;
  logoBgColor: string;
  frameLabel: string;
  frameLabelColor: string;
};

export const defaultDesign: QRDesign = {
  dotColor: "#000000",
  dotColor2: "",
  gradientDir: "diagonal",
  bgColor: "#ffffff",
  dotStyle: "square",
  cornerDotStyle: "square",
  cornerSquareStyle: "square",
  logo: "",
  logoMode: "center",
  logoSize: 0.25,
  logoBgColor: "#ffffff",
  frameLabel: "",
  frameLabelColor: "#000000",
};

async function getMatrix(text: string): Promise<boolean[][]> {
  const QRCode = (await import("qrcode")).default;
  const qr = (QRCode as any).create(text, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const m: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    m[r] = [];
    for (let c = 0; c < size; c++) m[r][c] = qr.modules.get(r, c);
  }
  return m;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darkenRgb(r: number, g: number, b: number, amount = 0.55): string {
  return `rgb(${Math.round(r * amount)},${Math.round(g * amount)},${Math.round(b * amount)})`;
}

function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath(); ctx.fill();
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, style: DotStyle, color?: string) {
  if (color) ctx.fillStyle = color;
  const m = cs * 0.08, s = cs - m * 2, cx = x + cs / 2, cy = y + cs / 2;
  switch (style) {
    case "circle": ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); ctx.fill(); break;
    case "rounded": rRect(ctx, x + m, y + m, s, s, s * 0.35); break;
    case "diamond":
      ctx.beginPath(); ctx.moveTo(cx, y + m); ctx.lineTo(x + m + s, cy);
      ctx.lineTo(cx, y + m + s); ctx.lineTo(x + m, cy); ctx.closePath(); ctx.fill(); break;
    default: ctx.fillRect(x + m, y + m, s, s);
  }
}

function drawFinder(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, cs: number,
  sq: DotStyle, dot: DotStyle,
  color: string, bg: string
) {
  const full = 7 * cs;
  ctx.fillStyle = color;
  if (sq === "circle") {
    ctx.beginPath(); ctx.arc(ox + full / 2, oy + full / 2, full / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(ox + full / 2, oy + full / 2, full / 2 - cs, 0, Math.PI * 2); ctx.fill();
  } else if (sq === "rounded") {
    rRect(ctx, ox, oy, full, full, cs * 1.2);
    ctx.fillStyle = bg; rRect(ctx, ox + cs, oy + cs, 5 * cs, 5 * cs, cs * 0.8);
  } else {
    ctx.fillRect(ox, oy, full, full);
    ctx.fillStyle = bg; ctx.fillRect(ox + cs, oy + cs, 5 * cs, 5 * cs);
  }
  ctx.fillStyle = color;
  const ix = ox + 2 * cs, iy = oy + 2 * cs, is = 3 * cs;
  if (dot === "circle") { ctx.beginPath(); ctx.arc(ix + is / 2, iy + is / 2, is / 2, 0, Math.PI * 2); ctx.fill(); }
  else if (dot === "rounded") { rRect(ctx, ix, iy, is, is, cs * 0.6); }
  else { ctx.fillRect(ix, iy, is, is); }
}

export async function renderQR(
  canvas: HTMLCanvasElement,
  text: string,
  design: QRDesign,
  size = 500
) {
  const matrix = await getMatrix(text);
  const n = matrix.length;
  const qz = 2;
  const cs = size / (n + qz * 2);
  const off = qz * cs;
  const hasLabel = !!design.frameLabel;
  const labelH = hasLabel ? cs * 2.5 : 0;

  canvas.width = size;
  canvas.height = size + labelH;
  const ctx = canvas.getContext("2d")!;

  // ── LOGO MODES ──────────────────────────────────────────────────────────────
  const qrW = n * cs, qrH = n * cs;
  let logoImg: HTMLImageElement | null = null;
  let logoPixels: ImageData | null = null;

  if (design.logo && design.logoMode !== "center") {
    try {
      logoImg = await loadImage(design.logo);

      // Render logo to offscreen canvas at QR size for pixel sampling
      const offCanvas = document.createElement("canvas");
      offCanvas.width = Math.round(qrW);
      offCanvas.height = Math.round(qrH);
      const offCtx = offCanvas.getContext("2d")!;
      offCtx.drawImage(logoImg, 0, 0, offCanvas.width, offCanvas.height);
      logoPixels = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    } catch { logoImg = null; logoPixels = null; }
  }

  const sampleLogoColor = (r: number, c: number): [number, number, number, number] => {
    if (!logoPixels) return [0, 0, 0, 255];
    const px = Math.min(Math.round(c * cs + cs / 2), logoPixels.width - 1);
    const py = Math.min(Math.round(r * cs + cs / 2), logoPixels.height - 1);
    const i = (py * logoPixels.width + px) * 4;
    return [logoPixels.data[i], logoPixels.data[i+1], logoPixels.data[i+2], logoPixels.data[i+3]];
  };

  // ── Background ───────────────────────────────────────────────────────────────
  ctx.fillStyle = design.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Logo background modes ────────────────────────────────────────────────────
  if (logoImg && design.logoMode === "immersed") {
    // Full logo at 75% opacity as background
    ctx.globalAlpha = 0.75;
    ctx.drawImage(logoImg, off, off, qrW, qrH);
    ctx.globalAlpha = 1;
    // Light overlay to ensure dot contrast
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(off, off, qrW, qrH);
  }

  if (logoImg && design.logoMode === "tinted") {
    // Full logo at 25% opacity — dots on top colored from logo
    ctx.globalAlpha = 0.25;
    ctx.drawImage(logoImg, off, off, qrW, qrH);
    ctx.globalAlpha = 1;
  }

  // ── Build standard fill ──────────────────────────────────────────────────────
  let standardFill: string | CanvasGradient = design.dotColor;
  if (design.dotColor2 && design.logoMode === "center") {
    let grad: CanvasGradient;
    if (design.gradientDir === "radial") {
      const cx = off + qrW / 2, cy = off + qrH / 2;
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, qrW / 2);
    } else if (design.gradientDir === "vertical") {
      grad = ctx.createLinearGradient(off, off, off, off + qrH);
    } else if (design.gradientDir === "horizontal") {
      grad = ctx.createLinearGradient(off, off, off + qrW, off);
    } else {
      grad = ctx.createLinearGradient(off, off, off + qrW, off + qrH);
    }
    grad.addColorStop(0, design.dotColor);
    grad.addColorStop(1, design.dotColor2);
    standardFill = grad;
  }

  // ── Finder patterns ──────────────────────────────────────────────────────────
  const fps = [{ r: 0, c: 0 }, { r: 0, c: n - 7 }, { r: n - 7, c: 0 }];
  fps.forEach(({ r, c }) => {
    drawFinder(ctx, off + c * cs, off + r * cs, cs,
      design.cornerSquareStyle, design.cornerDotStyle,
      design.dotColor, design.bgColor);
  });

  // ── Data modules ─────────────────────────────────────────────────────────────
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // Skip finder areas
      if ((r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8)) continue;

      const x = off + c * cs, y = off + r * cs;

      if (design.logoMode === "shaped" && logoPixels) {
        // Only draw where logo has visible pixels
        const [lr, lg, lb, la] = sampleLogoColor(r, c);
        if (la < 30) {
          // Outside logo shape — draw faint dot so QR stays scannable
          if (matrix[r][c]) {
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            drawDot(ctx, x, y, cs, design.dotStyle);
          }
          continue;
        }
        if (matrix[r][c]) {
          // Inside logo shape — use darkened logo color
          ctx.fillStyle = darkenRgb(lr, lg, lb, 0.6);
          drawDot(ctx, x, y, cs, design.dotStyle);
        } else {
          // Light module inside logo — use light logo color
          ctx.fillStyle = `rgba(${lr},${lg},${lb},0.15)`;
          drawDot(ctx, x, y, cs, design.dotStyle);
        }

      } else if ((design.logoMode === "tinted" || design.logoMode === "immersed") && logoPixels) {
        if (matrix[r][c]) {
          const [lr, lg, lb] = sampleLogoColor(r, c);
          ctx.fillStyle = darkenRgb(lr, lg, lb, design.logoMode === "immersed" ? 0.45 : 0.55);
          drawDot(ctx, x, y, cs, design.dotStyle);
        }
      } else {
        // Standard mode
        if (matrix[r][c]) {
          ctx.fillStyle = standardFill;
          drawDot(ctx, x, y, cs, design.dotStyle);
        }
      }
    }
  }

  // ── Center logo (center mode only) ───────────────────────────────────────────
  if (design.logo && design.logoMode === "center") {
    try {
      const img = logoImg || await loadImage(design.logo);
      const logoArea = qrW * Math.min(design.logoSize, 0.35);
      const lx = off + (qrW - logoArea) / 2;
      const ly = off + (qrH - logoArea) / 2;
      const pad = logoArea * 0.12;
      const bgS = logoArea + pad * 2;
      ctx.fillStyle = design.logoBgColor;
      rRect(ctx, lx - pad, ly - pad, bgS, bgS, bgS * 0.18);
      ctx.drawImage(img, lx, ly, logoArea, logoArea);
    } catch { /* skip */ }
  }

  // ── Frame label ───────────────────────────────────────────────────────────────
  if (hasLabel) {
    ctx.fillStyle = design.frameLabelColor;
    ctx.font = `bold ${cs * 1.2}px Syne, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(design.frameLabel, size / 2, size + labelH / 2);
  }
}
