"use client";
import { useState } from "react";
import { QRCode } from "@/lib/supabase";
import styles from "./CreateModal.module.css";

export default function CreateModal({ onClose, onCreated, showToast }: {
  onClose: () => void;
  onCreated: (code: QRCode) => void;
  showToast: (msg: string, type?: "ok" | "err") => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = "https://" + finalUrl;

      // Server-side API — enforces plan limits on the backend
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || finalUrl, destination_url: finalUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      onCreated(data as QRCode);
    } catch (e: unknown) {
      showToast((e instanceof Error ? e.message : "Unknown error"), "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>New QR Code</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Destination URL *</label>
          <input className={styles.input} placeholder="https://yourwebsite.com" value={url}
            onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} autoFocus />
          <p className={styles.hint}>Where the QR code will redirect when scanned</p>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Label <span style={{ color: "var(--fg2)", fontWeight: 400 }}>(optional)</span></label>
          <input className={styles.input} placeholder="e.g. Summer Campaign" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} />
        </div>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>Cancel</button>
          <button className={styles.submit} onClick={create} disabled={!url.trim() || loading}>
            {loading ? "Creating..." : "Generate QR Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
