"use client";

const TOTAL_SPOTS = 20;
const TAKEN_SPOTS = 13;
const REMAINING = TOTAL_SPOTS - TAKEN_SPOTS;
const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#stripe";

const includes = [
  "Voice → invoice in 60 seconds",
  "Unlimited job records",
  "Automatic customer invoicing by email",
  "SMS payment follow-ups",
  "WhatsApp AI assistant",
  "Weekly job & payment briefing",
  "All Phase 2 & 3 features — free as they launch",
  "Direct line to the builder — your feedback shapes the product",
  "Price locked forever, even when we charge €99/month at launch",
];

export default function Founding() {
  const pct = Math.round((TAKEN_SPOTS / TOTAL_SPOTS) * 100);

  return (
    <section
      id="founding"
      style={{
        padding: "80px 0",
        background: "linear-gradient(160deg, rgba(13,148,136,0.04) 0%, transparent 60%)",
      }}
    >
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 52px" }}>
          <p className="section-label">Founding member offer</p>
          <h2
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              marginBottom: 14,
            }}
          >
            Get in early.{" "}
            <span className="gradient-text">Pay less, forever.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.6 }}>
            The first 20 contractors who join lock in €49/month for life.
            When we open to the public, it&apos;s €99/month. No exceptions.
          </p>
        </div>

        <div
          style={{
            maxWidth: 580,
            margin: "0 auto",
            background: "var(--surface)",
            border: "1.5px solid rgba(13,148,136,0.3)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 8px 48px rgba(13,148,136,0.1)",
          }}
        >
          {/* Top band */}
          <div
            style={{
              background: "var(--accent)",
              padding: "20px 32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Founding Member
              </div>
              <div style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "white" }}>
                Docket by Intrigue8
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "white", fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                €49
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>/month · locked forever</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2, textDecoration: "line-through" }}>
                €99/month at launch
              </div>
            </div>
          </div>

          {/* Spots counter */}
          <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                Spots remaining
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: REMAINING <= 5 ? "#ef4444" : "var(--accent)",
                }}
              >
                {REMAINING} of {TOTAL_SPOTS} left
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            {REMAINING <= 5 && (
              <p style={{ marginTop: 8, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                ⚠ Only {REMAINING} spots left — price goes to €99/month when these are gone.
              </p>
            )}
          </div>

          {/* Includes list */}
          <div style={{ padding: "24px 32px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Everything included
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {includes.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "var(--text-1)", lineHeight: 1.5 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="9" cy="9" r="8" fill="var(--accent-dim)" />
                    <path d="M5.5 9l2.5 2.5 5-5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div style={{ padding: "20px 32px 32px" }}>
            <a
              href={STRIPE_LINK}
              className="btn-primary"
              style={{ width: "100%", fontSize: 16, padding: "16px 24px", borderRadius: 10, justifyContent: "center" }}
            >
              Claim my founding spot — €49/month
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-3)", textAlign: "center" }}>
              No long contracts · Cancel anytime · Irish builder, Irish support
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div style={{ maxWidth: 580, margin: "32px auto 0" }}>
          <div className="card" style={{ background: "var(--accent-dim)", border: "1px solid rgba(13,148,136,0.15)" }}>
            <div style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
              What happens after you sign up
            </div>
            <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "You get a WhatsApp message from Adam (the builder) introducing himself.",
                "He walks you through sending your first voice note — takes about 5 minutes.",
                "You see your first invoice go out in under 60 seconds.",
                "You're in. That's it.",
              ].map((step, i) => (
                <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--text-1)", lineHeight: 1.5 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      background: "var(--accent)",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
