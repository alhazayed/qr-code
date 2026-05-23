"use client";
import { useEffect, useRef, useState } from "react";
import { renderQR, QRDesign, defaultDesign } from "@/lib/qr-render";

export default function QRCanvas({
  data,
  design,
  size = 260,
  className,
}: {
  data: string;
  design?: Partial<QRDesign>;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const merged = { ...defaultDesign, ...design };

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    setReady(false);
    renderQR(canvasRef.current, data, merged, size).then(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, size, JSON.stringify(merged)]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", opacity: ready ? 1 : 0.4, transition: "opacity .2s", borderRadius: 4 }}
    />
  );
}
