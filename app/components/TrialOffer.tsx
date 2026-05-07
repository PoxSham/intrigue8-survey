"use client";

import { useState } from "react";

const TRADES = [
  "Plumber",
  "Electrician",
  "Roofer",
  "Builder / General contractor",
  "Tiler",
  "Plasterer",
  "Carpenter / Joiner",
  "Painter & Decorator",
  "Other",
];

export default function TrialOffer() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = (id: string) => (form.elements.namedItem(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)?.value ?? "";

    const subject = encodeURIComponent(`Docket Trial Application — ${d("name")} (${d("trade")})`);
    const body = encodeURIComponent(
      `Name: ${d("name")}\nTrade: ${d("trade")}\nWhatsApp: ${d("phone")}\nCounty: ${d("county")}\n\nBiggest admin headache:\n${d("headache") || "Not provided"}`
    );

    window.location.href = `mailto:adam@intrigue8.ie?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section
      id="trial"
      style={{
        padding: "80px 0",
        background: "linear-gradient(160deg, rgba(13,148,136,0.04) 0%, transparent 60%)",
      }}
    >
      <div className="wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "start",
          }}
          className="trial-grid"
        >
          {/* Left — the offer */}
          <div>
            <p className="section-label">Trial offer</p>
            <h2
              style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-1)",
                marginBottom: 16,
              }}
            >
              Try it free.{" "}
              <span className="gradient-text">Pay less, forever.</span>
            </h2>

            <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 36 }}>
              Three tradespeople get 30 days free. If Docket saves you time,
              you lock in at <strong style={{ color: "var(--text-1)" }}>€49.99/month — for life.</strong>{" "}
              When we open to everyone else, it&apos;s €149/month. No exceptions.
            </p>

            {/* Offer comparison */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                {
                  label: "Trial (3 spots)",
                  price: "Free",
                  sub: "30 days, no card required",
                  highlight: true,
                },
                {
                  label: "After trial — locked forever",
                  price: "€49.99/mo",
                  sub: "if you choose to continue",
                  highlight: true,
                },
                {
                  label: "Public launch price",
                  price: "€149/mo",
                  sub: "everyone else pays this",
                  highlight: false,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    borderRadius: 10,
                    background: row.highlight ? "var(--accent-dim)" : "transparent",
                    border: row.highlight
                      ? "1px solid rgba(13,148,136,0.2)"
                      : "1px solid var(--border)",
                    opacity: row.highlight ? 1 : 0.55,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: row.highlight ? "var(--text-1)" : "var(--text-2)",
                        marginBottom: 2,
                      }}
                    >
                      {row.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{row.sub}</div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                      fontSize: row.highlight ? 20 : 16,
                      fontWeight: 800,
                      color: row.highlight ? "var(--accent)" : "var(--text-3)",
                      textDecoration: !row.highlight ? "line-through" : undefined,
                    }}
                  >
                    {row.price}
                  </div>
                </div>
              ))}
            </div>

            {/* What they get */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              What&apos;s included in the trial
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Voice note → job record in 60 seconds",
                "Professional invoice sent to your customer",
                "SMS payment follow-up reminders",
                "WhatsApp AI assistant — ask anything about your jobs",
                "Weekly job & payment briefing",
                "Direct line to Adam — feedback shapes the system",
              ].map((item) => (
                <li
                  key={item}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="8" cy="8" r="7" fill="var(--accent-dim)" />
                    <path d="M5 8l2 2 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — application form */}
          <div>
            <div
              style={{
                background: "var(--surface)",
                border: "1.5px solid rgba(13,148,136,0.25)",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(13,148,136,0.08)",
              }}
            >
              {/* Form header */}
              <div style={{ background: "var(--accent)", padding: "20px 28px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  3 spots · 30-day free trial
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  Apply to trial Docket
                </div>
              </div>

              {submitted ? (
                <div style={{ padding: "40px 28px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                  <h3
                    style={{
                      fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--text-1)",
                      marginBottom: 10,
                    }}
                  >
                    Your email app should have opened.
                  </h3>
                  <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.65 }}>
                    Hit send and Adam will be in touch on WhatsApp within 24 hours.
                    Prefer to message directly?{" "}
                    <a href="mailto:adam@intrigue8.ie" style={{ color: "var(--accent)" }}>
                      adam@intrigue8.ie
                    </a>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}
                    >
                      Your name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Seán Murphy"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "var(--text-1)",
                        background: "var(--bg)",
                        outline: "none",
                        transition: "border-color 0.15s",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </div>

                  {/* Trade */}
                  <div>
                    <label
                      htmlFor="trade"
                      style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}
                    >
                      Your trade
                    </label>
                    <select
                      id="trade"
                      name="trade"
                      required
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "var(--text-1)",
                        background: "var(--bg)",
                        outline: "none",
                        fontFamily: "inherit",
                        cursor: "pointer",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 14px center",
                        paddingRight: 36,
                      }}
                    >
                      <option value="">Select your trade…</option>
                      {TRADES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* WhatsApp number */}
                  <div>
                    <label
                      htmlFor="phone"
                      style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}
                    >
                      WhatsApp number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="+353 86 000 0000"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "var(--text-1)",
                        background: "var(--bg)",
                        outline: "none",
                        transition: "border-color 0.15s",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                    <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>
                      Docket works on WhatsApp — this is how you&apos;ll use it.
                    </p>
                  </div>

                  {/* County */}
                  <div>
                    <label
                      htmlFor="county"
                      style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}
                    >
                      County
                    </label>
                    <input
                      id="county"
                      name="county"
                      type="text"
                      required
                      placeholder="e.g. Galway"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "var(--text-1)",
                        background: "var(--bg)",
                        outline: "none",
                        transition: "border-color 0.15s",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </div>

                  {/* Biggest headache */}
                  <div>
                    <label
                      htmlFor="headache"
                      style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}
                    >
                      Biggest admin headache? <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      id="headache"
                      name="headache"
                      rows={3}
                      placeholder="e.g. chasing invoices, forgetting what jobs I did last week…"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "var(--text-1)",
                        background: "var(--bg)",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px 24px", borderRadius: 10 }}
                  >
                    Apply for a trial spot
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", lineHeight: 1.5 }}>
                    No card required. Adam will WhatsApp you within 24 hours.
                    <br />
                    Or email{" "}
                    <a href="mailto:adam@intrigue8.ie" style={{ color: "var(--accent)" }}>
                      adam@intrigue8.ie
                    </a>{" "}
                    directly.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .trial-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  );
}
