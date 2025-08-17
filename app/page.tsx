"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/** ----- Bot registry ----- */
type Bot = {
  id: "landscaping" | "fencing" | "concrete" | "excavation";
  name: string;
  emoji: string;
  color: string; // accent color
  examples: string[];
};

const BOTS: Bot[] = [
  {
    id: "landscaping",
    name: "Landscaping",
    emoji: "🌿",
    color: "#10b981",
    examples: [
      "Mulch 900 sq ft at 3 inches",
      "Sod 1,200 sq ft remove old turf",
      "Mowing 6,000 sq ft (tight access)",
      "Gravel 800 sq ft 2 inches",
    ],
  },
  {
    id: "fencing",
    name: "Fencing",
    emoji: "🛠️",
    color: "#60a5fa",
    examples: [
      "Fence 120 ft wood 6 ft tall",
      "Fence 220 ft chain link",
      "Fence 80 ft with 1 gate",
    ],
  },
  {
    id: "concrete",
    name: "Concrete",
    emoji: "🧱",
    color: "#f59e0b",
    examples: [
      "Concrete 12x20 ft at 4 inches",
      "Concrete 400 sq ft 5 in",
      "Concrete 10x30 driveway 4 in",
    ],
  },
  {
    id: "excavation",
    name: "Excavation",
    emoji: "🚜",
    color: "#ef4444",
    examples: [
      "Excavate 30x20 ft to 2 ft deep",
      "Excavation 25 yd³ haul off",
      "Trench 60 ft 1.5 ft wide 2 ft deep",
    ],
  },
];

/** ----- Pricing (shared for now; per-bot later with accounts) ----- */
type Pricing = {
  // general
  deliveryFee: number;
  tripFee: number;
  laborHourly: number;
  crewSize: number;
  taxRate: number; // 0.0825 = 8.25%
  markup: number;  // 0.18 = 18%
  waste: number;   // 0.08 = 8%

  // landscaping
  mulchPerYd: number;
  sodPerSqFt: number;
  disposalPerYd: number;
  gravelPerTon: number;
  gravelDensityLbPerFt3: number;
  mowingPerKSqFt: number;
  mowingMin: number;

  // fencing
  fencePerLf: number;
  gateEach: number;

  // concrete
  concretePerYd: number;
  rebarPerSqFt: number;

  // excavation
  excavationPerYd: number;
  haulPerYd: number;
};

const DEFAULTS: Pricing = {
  // general
  deliveryFee: 75,
  tripFee: 35,
  laborHourly: 55,
  crewSize: 2,
  taxRate: 0.0825,
  markup: 0.18,
  waste: 0.08,

  // landscaping
  mulchPerYd: 45,
  sodPerSqFt: 0.65,
  disposalPerYd: 25,
  gravelPerTon: 38,
  gravelDensityLbPerFt3: 100,
  mowingPerKSqFt: 7.5,
  mowingMin: 45,

  // fencing
  fencePerLf: 28,
  gateEach: 150,

  // concrete
  concretePerYd: 165,
  rebarPerSqFt: 0.6,

  // excavation
  excavationPerYd: 18,
  haulPerYd: 22,
};

function inputStyle() {
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
  /** Selected bot (persist) */
  const [botId, setBotId] = useState<Bot["id"]>(() => {
    if (typeof window === "undefined") return "landscaping";
    return (localStorage.getItem("landscapebot:botId") as Bot["id"]) || "landscaping";
  });
  useEffect(() => {
    try { localStorage.setItem("landscapebot:botId", botId); } catch {}
  }, [botId]);
  const bot = useMemo(() => BOTS.find(b => b.id === botId)!, [botId]);

  /** Chat state */
  const [log, setLog] = useState<string[]>([
    `👋 You’re using the ${bot.emoji} ${bot.name} bot. Try an example below.`,
  ]);
  useEffect(() => {
    setLog([`👋 You’re using the ${bot.emoji} ${bot.name} bot. Try an example below.`]);
  }, [botId]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  /** Pricing settings (shared; persist) */
  const [pricing, setPricing] = useState<Pricing>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    const raw = localStorage.getItem("landscapebot:pricing");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  });
  useEffect(() => {
    try { localStorage.setItem("landscapebot:pricing", JSON.stringify(pricing)); } catch {}
  }, [pricing]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  /** Send */
  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setLog(l => [...l, "👷 You: " + text]);
    setInput("");
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pricing, botId }),
      });
      const data = await res.json();
      setLog(l => [...l, `🤖 ${bot.emoji} ` + (data.reply || data.error || "Hmm, try again.")]);
    } catch {
      setLog(l => [...l, `🤖 ${bot.emoji} Network error.`]);
    } finally {
      setBusy(false);
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
      {/* Bot picker */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {BOTS.map(b => {
          const active = b.id === botId;
          return (
            <button
              key={b.id}
              onClick={() => setBotId(b.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 10,
                border: `2px solid ${active ? b.color : "#374151"}`,
                background: active ? "#0b1220" : "#111827",
                color: active ? "#ffffff" : "#d1d5db",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 18 }}>{b.emoji}</span>
              <span style={{ fontWeight: 700 }}>{b.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setSettingsOpen(s => !s)}
          style={{
            marginLeft: "auto",
            padding: "10px 12px",
            borderRadius: 8,
            background: "#111827",
            border: "1px solid #374151",
            color: "#d1d5db",
            cursor: "pointer",
          }}
        >
          {settingsOpen ? "Close Settings" : "Open Settings"}
        </button>
      </div>

      {/* Example chips (per bot) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {bot.examples.map(ex => (
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
          whiteSpace: "pre-wrap",
        }}
      >
        {log.map((line, i) => {
          const mine = line.startsWith("👷");
          return (
            <div key={i} style={{ margin: "8px 0", textAlign: mine ? ("right" as const) : "left" }}>
              <span
                style={{
                  display: "inline-block",
                  background: mine ? bot.color : "#1f2937",
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

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask the ${bot.name} bot…`}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
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
            background: busy ? "#059669" : bot.color,
            color: "white",
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <section
          style={{
            marginTop: 16,
            border: "1px solid #374151",
            background: "#0b1220",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#e5e7eb" }}>
            Pricing Settings (shared for all bots)
          </h2>
          <p style={{ color: "#9ca3af", marginTop: 6, marginBottom: 12 }}>
            Saved on this device. (Per-trade & team accounts come later.)
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
            {/* General */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Labor $/hr per person
              <input type="number" step="0.01" value={pricing.laborHourly}
                onChange={e => setPricing(p => ({ ...p, laborHourly: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Crew size
              <input type="number" step="1" value={pricing.crewSize}
                onChange={e => setPricing(p => ({ ...p, crewSize: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Markup %
              <input type="number" step="0.1" value={pricing.markup * 100}
                onChange={e => setPricing(p => ({ ...p, markup: Number(e.target.value) / 100 }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Tax %
              <input type="number" step="0.1" value={pricing.taxRate * 100}
                onChange={e => setPricing(p => ({ ...p, taxRate: Number(e.target.value) / 100 }))}
                style={inputStyle()} />
            </label>

            <label style={{ fontSize: 12, color: "#9ca3af" }}>Delivery fee $
              <input type="number" step="0.01" value={pricing.deliveryFee}
                onChange={e => setPricing(p => ({ ...p, deliveryFee: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Trip/setup $
              <input type="number" step="0.01" value={pricing.tripFee}
                onChange={e => setPricing(p => ({ ...p, tripFee: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Waste %
              <input type="number" step="0.1" value={pricing.waste * 100}
                onChange={e => setPricing(p => ({ ...p, waste: Number(e.target.value) / 100 }))}
                style={inputStyle()} />
            </label>
            <div />

            {/* Landscaping */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Mulch $/yd³
              <input type="number" step="0.01" value={pricing.mulchPerYd}
                onChange={e => setPricing(p => ({ ...p, mulchPerYd: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Sod $/sq ft
              <input type="number" step="0.01" value={pricing.sodPerSqFt}
                onChange={e => setPricing(p => ({ ...p, sodPerSqFt: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Disposal $/yd³
              <input type="number" step="0.01" value={pricing.disposalPerYd}
                onChange={e => setPricing(p => ({ ...p, disposalPerYd: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <div />

            <label style={{ fontSize: 12, color: "#9ca3af" }}>Gravel $/ton
              <input type="number" step="0.01" value={pricing.gravelPerTon}
                onChange={e => setPricing(p => ({ ...p, gravelPerTon: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Gravel density lb/ft³
              <input type="number" step="1" value={pricing.gravelDensityLbPerFt3}
                onChange={e => setPricing(p => ({ ...p, gravelDensityLbPerFt3: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>

            {/* Fencing */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Fence $/linear ft
              <input type="number" step="0.01" value={pricing.fencePerLf}
                onChange={e => setPricing(p => ({ ...p, fencePerLf: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Gate $ each
              <input type="number" step="0.01" value={pricing.gateEach}
                onChange={e => setPricing(p => ({ ...p, gateEach: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>

            {/* Concrete */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Concrete $/yd³
              <input type="number" step="0.01" value={pricing.concretePerYd}
                onChange={e => setPricing(p => ({ ...p, concretePerYd: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Rebar $/sq ft
              <input type="number" step="0.01" value={pricing.rebarPerSqFt}
                onChange={e => setPricing(p => ({ ...p, rebarPerSqFt: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>

            {/* Excavation */}
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Excavation $/yd³
              <input type="number" step="0.01" value={pricing.excavationPerYd}
                onChange={e => setPricing(p => ({ ...p, excavationPerYd: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
            <label style={{ fontSize: 12, color: "#9ca3af" }}>Haul/Disposal $/yd³
              <input type="number" step="0.01" value={pricing.haulPerYd}
                onChange={e => setPricing(p => ({ ...p, haulPerYd: Number(e.target.value) }))}
                style={inputStyle()} />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => setPricing(DEFAULTS)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "#111827",
                border: "1px solid #374151",
                color: "#d1d5db",
                cursor: "pointer",
              }}
            >
              Reset to defaults
            </button>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>
              Settings are saved automatically on this device.
            </span>
          </div>
        </section>
      )}
    </main>
  );
}
