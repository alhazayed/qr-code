import { QRCode } from "@/lib/supabase";
import styles from "./QRCard.module.css";

function getScanUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/api/scan/${id}`;
}

function qrImgUrl(id: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(getScanUrl(id))}&format=png&ecc=M`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function QRCard({ code, delay, onClick }: { code: QRCode; delay?: number; onClick: () => void }) {
  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${delay ?? 0}s` }}
      onClick={onClick}
    >
      <div className={styles.top}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImgUrl(code.id)} alt="QR" className={styles.qr} />
        <div className={styles.info}>
          <div className={styles.name}>{code.name}</div>
          <div className={styles.url}>{code.destination_url}</div>
          <div className={styles.date}>Created {fmtDate(code.created_at)}</div>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeNum}>{code.total_scans}</span>
          <span className={styles.badgeLabel}>scans</span>
        </div>
      </div>
      {code.last_scanned_at && (
        <div className={styles.last}>
          Last scan: {new Date(code.last_scanned_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}
