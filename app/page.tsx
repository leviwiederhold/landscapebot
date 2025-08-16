"use client";
import { useState } from "react";

export default function Home() {
  const [log, setLog] = useState<string[]>([
    "👋 What are we estimating today? (e.g., Mulch 900 sq ft at 3 inches)"
  ]);
  const [input, setInput] = useState("");

  async function send() {
    const text = input.trim();
    if (!text) return;
    setLog(l => [...l, "👷 You: " + text]);
    setInput("");

    const res = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    setLog(l => [...l, "🤖 Bot: " + (data.reply || data.error || "Hmm, try again.")]);
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720, margin: "0 auto" }}>
      <h1>LandscapeBot</h1>
      <p style={{ color: "#666" }}>Instant ballpark estimates for mulch, sod & gravel.</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, minHeight: 220, marginTop: 12, whiteSpace: "pre-wrap" }}>
        {log.map((line, i) => <div key={i} style={{ margin: "6px 0" }}>{line}</div>)}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe the job…"
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6 }}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
        />
        <button onClick={send} style={{ padding: "10px 16px", borderRadius: 6, background: "#10b981", color: "white", border: "none" }}>
          Send
        </button>
      </div>

      <p style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
        Estimates are ballpark only. Site visit required for a firm quote.
      </p>
    </main>
  );
}
