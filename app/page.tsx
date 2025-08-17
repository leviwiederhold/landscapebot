"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Pricing = {
  deliveryFee: number;
  tripFee: number;
  laborHourly: number;
  crewSize: number;
  taxRate: number;
  markup: number;
  waste: number;
  mulchPerYd: number;
  sodPerSqFt: number;
  disposalPerYd: number;
  gravelPerTon: number;
  gravelDensityLbPerFt3: number;
  mowingPerKSqFt: number;
  mowingMin: number;
};

type Business = {
  name: string;
  phone: string;
  email: string;
  logoDataUrl: string; // base64 data URL
};

const DEFAULTS: Pricing = {
  deliveryFee: 75,
  tripFee: 35,
  laborHourly: 55,
  crewSize: 2,
  taxRate: 0.0825,
  markup: 0.18,
  waste: 0.08,
  mulchPerYd: 45,
  sodPerSqFt: 0.65,
  disposalPerYd: 25,
  gravelPerTon: 38,
  gravelDensityLbPerFt3: 100,
  mowingPerKSqFt: 7.5,
  mowingMin: 45,
};

const DEFAULT_BIZ: Business = {
  name: "Your Landscaping Co.",
  phone: "",
  email: "",
  logoDataUrl: "",
};

function numberInputStyle() {
  return {
    padding: "8px 10px",
    border: "1px solid #374151",
    borderRadius: 6,
    background: "#0b1220",
    color: "#e5e7eb",
    width: "100%",
  } as const;
}

export default function Home() {
  // Chat state
  const [log, setLog] = useState<string[]>([
    "👋 What landscaping job are we estimating today? Try: “Mulch 900 sq ft at 3 inches”, “Sod 1,200 sq ft remove old turf”, “Mowing 6,000 sq ft (tight access)”, “Gravel 800 sq ft 2 inches”."
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Business profile + Pricing (persisted locally)
  const [biz, setBiz] = useState<Business>(DEFAULT_BIZ);
  const [pricing, setPricing] = useState<Pricing>(DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Optional lead form
  const [lead, setLead] = useState({ name: "", phone: "", email: "", note: "" });
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadMsg, setLeadMsg] = useState("");

  // Last estimate text (for PDF + notes)
  const [lastEstimate, setLastEstimate] = useState("");

  // Load persisted settings
  useEffect(() => {
    try {
      const p = localStorage.getItem("landscapebot:pricing");
      if (p) setPricing({ ...DEFAULTS, ...JSON.parse(p) });
    } catch {}
    try {
      const b = localStorage.getItem("landscapebot:business");
      if (b) setBiz({ ...DEFAULT_BIZ, ...JSON.parse(b) });
    } catch {}
  }, []);
  // Persist on change
  useEffect(() => {
    try { localStorage.setItem("landscapebot:pricing", JSON.stringify(pricing)); } catch {}
  }, [pricing]);
  useEffect(() => {
    try { localStorage.setItem("landscapebot:business", JSON.stringify(biz)); } catch {}
  }, [biz]);

  const examples = useMemo(
    () => [
      "Mulch 900 sq ft at 3 inches",
      "Sod 1,200 sq ft remove old turf",
      "Mowing 6,000 sq ft (tight access)",
      "Gravel 800 sq ft 2 inches",
    ],
    []
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setLog((l) => [...l, "👷 You: " + text]);
    setInput("");

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pricing }), // send contractor pricing
      });
      const data = await res.json();
      const replyText = (data.reply || data.error || "Hmm, try again.") as string;
      setLog((l) => [...l, "🤖 Bot: " + replyText]);
      setLastEstimate(replyText);
    } catch {
      setLog((l) => [...l, "🤖 Bot: Network error."]);
    } finally {
      setBusy(false);
    }
  }

  async function submitLead() {
    setLeadMsg("");
    if (!lead.name || (!lead.phone && !lead.email)) {
      setLeadMsg("Please enter your name and a phone or email.");
      return;
    }
    setLeadBusy(true);
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      const d = await r.json();
      if (d.ok) {
        setLead({ name: "", phone: "", email: "", note: "" });
        setLeadMsg("Thanks — we’ll reach out shortly.");
      } else {
        setLeadMsg(d.error || "Something went wrong.");
      }
    } catch {
      setLeadMsg("Network error.");
    } finally {
      setLeadBusy(false);
    }
  }

  // Logo upload -> base64 data URL
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      alert("Please upload a PNG or JPG logo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBiz((b) => ({ ...b, logoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  // Generate branded PDF (calls /api/pdf)
  async function downloadPdf() {
    if (!lastEstimate) {
      alert("Run an estimate first.");
      return;
    }
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate: lastEstimate, business: biz }),
      });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "estimate.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not generate PDF.");
      console.error(e);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        maxWidth: 980,
        margin: "0 auto",
        color: "#e5e7eb",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>LandscapeBot</h1>
          <p style={{ color: "#9ca3af", marginTop: 4 }}>
            Contractor tool for fast ballpark quotes — uses <b>your</b> pricing & branding.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={downloadPdf}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: "#10b981",
              color: "white",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Download PDF
          </button>
          <button
            onClick={() => setSettingsOpen((s) => !s)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: "#111827",
              border: "1px solid #374151",
              color: "#d1d5db",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {settingsOpen ? "Close Settings" : "Open Settings"}
          </button>
        </div>
      </header>

      {/* Settings panel: Business + Pricing */}
      {settingsOpen && (
        <section style={{ marginTop: 12, border: "1px solid #374151", background: "#0b1220", borderRadius: 8, padding: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#e5e7eb" }}>Your Business</h2>
          <p style={{ color: "#9ca3af", marginTop: 6, marginBottom: 12 }}>Set once. Saved locally for now (accounts later).</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, alignItems: "end" }}>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Business name
              <input value={biz.name} onChange={e => setBiz({ ...biz, name: e.target.value })} style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Phone
              <input value={biz.phone} onChange={e => setBiz({ ...biz, phone: e.target.value })} style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Email
              <input value={biz.email} onChange={e => setBiz({ ...biz, email: e.target.value })} style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Logo (PNG/JPG)
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange}
                style={{ ...numberInputStyle(), padding: 6 }} />
            </label>
          </div>

          {biz.logoDataUrl && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Preview: </span>
              <img src={biz.logoDataUrl} alt="Logo" style={{ height: 48, background: "white", borderRadius: 6, padding: 4 }} />
            </div>
          )}

          <hr style={{ margin: "16px 0", borderColor: "#1f2937" }} />

          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e5e7eb" }}>Your Pricing</h3>
          <p style={{ color: "#9ca3af", marginTop: 6, marginBottom: 12 }}>Used in all estimates.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
            {/* Labor & business */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Labor $/hr per person
              <input type="number" step="0.01" value={pricing.laborHourly}
                onChange={e => setPricing(p => ({ ...p, laborHourly: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Crew size
              <input type="number" step="1" value={pricing.crewSize}
                onChange={e => setPricing(p => ({ ...p, crewSize: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Markup %
              <input type="number" step="0.1" value={pricing.markup * 100}
                onChange={e => setPricing(p => ({ ...p, markup: Number(e.target.value) / 100 }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Tax %
              <input type="number" step="0.1" value={pricing.taxRate * 100}
                onChange={e => setPricing(p => ({ ...p, taxRate: Number(e.target.value) / 100 }))}
                style={numberInputStyle()} />
            </label>

            <label style={{ fontSize: 12, color: "#9ca3af" }}>Delivery fee $
              <input type="number" step="0.01" value={pricing.deliveryFee}
                onChange={e => setPricing(p => ({ ...p, deliveryFee: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Trip/setup $
              <input type="number" step="0.01" value={pricing.tripFee}
                onChange={e => setPricing(p => ({ ...p, tripFee: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Waste %
              <input type="number" step="0.1" value={pricing.waste * 100}
                onChange={e => setPricing(p => ({ ...p, waste: Number(e.target.value) / 100 }))}
                style={numberInputStyle()} />
            </label>
            <div />

            {/* Service prices */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Mulch $/yd³
              <input type="number" step="0.01" value={pricing.mulchPerYd}
                onChange={e => setPricing(p => ({ ...p, mulchPerYd: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Sod $/sq ft
              <input type="number" step="0.01" value={pricing.sodPerSqFt}
                onChange={e => setPricing(p => ({ ...p, sodPerSqFt: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Disposal $/yd³
              <input type="number" step="0.01" value={pricing.disposalPerYd}
                onChange={e => setPricing(p => ({ ...p, disposalPerYd: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <div />

            <label style={{ fontSize: 12, color: "#9ca3af" }}>Gravel $/ton
              <input type="number" step="0.01" value={pricing.gravelPerTon}
                onChange={e => setPricing(p => ({ ...p, gravelPerTon: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Gravel density lb/ft³
              <input type="number" step="1" value={pricing.gravelDensityLbPerFt3}
                onChange={e => setPricing(p => ({ ...p, gravelDensityLbPerFt3: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>

            <label style={{ fontSize: 12, color: "#9ca3af" }}>Mowing $ per 1,000 sq ft
              <input type="number" step="0.01" value={pricing.mowingPerKSqFt}
                onChange={e => setPricing(p => ({ ...p, mowingPerKSqFt: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Mowing minimum $
              <input type="number" step="0.01" value={pricing.mowingMin}
                onChange={e => setPricing(p => ({ ...p, mowingMin: Number(e.target.value) }))}
                style={numberInputStyle()} />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => setPricing(DEFAULTS)}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#111827", border: "1px solid #374151", color: "#d1d5db", cursor: "pointer" }}
            >
              Reset pricing to defaults
            </button>
            <button
              onClick={() => setBiz(DEFAULT_BIZ)}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#111827", border: "1px solid #374151", color: "#d1d5db", cursor: "pointer" }}
            >
              Reset business info
            </button>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>
              Settings are saved automatically on this device.
            </span>
          </div>
        </section>
      )}

      {/* Example chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setInput(ex)}
            style={{
              fontSize: 12,
              background: "#111827",
              color: "#d1d5db",
              border: "1px solid #374151",
              borderRadius: 999,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div
        style={{
          border: "1px solid #374151",
          background: "#111827",
          borderRadius: 8,
          padding: 16,
          minHeight: 260,
          marginTop: 12,
          whiteSpace: "pre-wrap",
          overflowY: "auto",
        }}
      >
        {log.map((line, i) => {
          const mine = line.startsWith("👷");
          return (
            <div key={i} style={{ margin: "8px 0", textAlign: mine ? ("right" as const) : "left" }}>
              <span
                style={{
                  display: "inline-block",
                  background: mine ? "#10b981" : "#1f2937",
                  color: mine ? "#ffffff" : "#e5e7eb",
                  padding: "8px 10px",
                  borderRadius: 8,
                  maxWidth: 860,
                }}
              >
                {line}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Copy last estimate */}
      <div>
        <button
          onClick={() => {
            const text =
              log
                .filter((l) => l.startsWith("🤖 Bot:"))
                .slice(-1)[0]
                ?.replace(/^🤖 Bot: /, "") || "";
            if (text) navigator.clipboard.writeText(text);
          }}
          style={{
            marginTop: 8,
            background: "#111827",
            border: "1px solid #374151",
            color: "#d1d5db",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Copy last estimate
        </button>
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the landscaping job…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #374151",
            borderRadius: 6,
            background: "#111827",
            color: "#e5e7eb",
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            background: busy ? "#059669" : "#10b981",
            color: "white",
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>

      <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
        Estimates are ballpark only. Site visit required for a firm quote.
      </p>

      {/* Lead capture (optional) */}
      <div style={{ marginTop: 20, border: "1px solid #374151", background: "#111827", borderRadius: 8, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#e5e7eb" }}>Book a site visit</h2>
        <p style={{ color: "#9ca3af", marginTop: 6, marginBottom: 12 }}>
          (Optional) If you use this with customers directly, capture their info here.
        </p>

        <button
          onClick={() =>
            setLead((l) => ({ ...l, note: (l.note ? l.note + "\n\n" : "") + (lastEstimate || "") }))
          }
          disabled={!lastEstimate}
          style={{
            background: "transparent",
            border: "none",
            color: lastEstimate ? "#34d399" : "#6b7280",
            textDecoration: lastEstimate ? "underline" : "none",
            cursor: lastEstimate ? "pointer" : "default",
            fontSize: 12,
            marginBottom: 8,
            padding: 0,
          }}
        >
          {lastEstimate ? "Add last estimate to notes" : "Do an estimate above to attach it here"}
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            placeholder="Name *"
            value={lead.name}
            onChange={(e) => setLead({ ...lead, name: e.target.value })}
            style={numberInputStyle()}
          />
          <input
            placeholder="Phone *"
            value={lead.phone}
            onChange={(e) => setLead({ ...lead, phone: e.target.value })}
            style={numberInputStyle()}
          />
          <input
            placeholder="Email (optional)"
            value={lead.email}
            onChange={(e) => setLead({ ...lead, email: e.target.value })}
            style={{ ...numberInputStyle(), gridColumn: "1 / span 2" }}
          />
          <textarea
            placeholder="Address / notes (optional)"
            value={lead.note}
            onChange={(e) => setLead({ ...lead, note: e.target.value })}
            rows={4}
            style={{ ...numberInputStyle(), gridColumn: "1 / span 2", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button
            onClick={submitLead}
            disabled={leadBusy}
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              background: leadBusy ? "#059669" : "#10b981",
              color: "white",
              border: "none",
              cursor: leadBusy ? "not-allowed" : "pointer",
            }}
          >
            {leadBusy ? "Submitting…" : "Request firm quote"}
          </button>

          <span style={{ color: "#9ca3af", fontSize: 12 }}>{leadMsg}</span>
        </div>
      </div>
    </main>
  );
}
