export default function Hero() {
  return (
    <section style={{ padding: "72px 0 80px", position: "relative", overflow: "hidden" }}>
      {/* Background grid decoration */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 70% 50%, rgba(13,148,136,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div className="wrap">
        <div style={{ maxWidth: 640 }}>
          {/* Chip */}
          <div className="chip" style={{ marginBottom: 24 }}>
            <span className="pulse-dot" />
            20 founding member spots — {" "}
            <span style={{ fontWeight: 800 }}>7 remaining</span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(36px, 5vw, 54px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              marginBottom: 20,
            }}
          >
            Your business
            <br />
            <span className="gradient-text">brain on WhatsApp.</span>
          </h1>

          {/* Subhead */}
          <p
            style={{
              fontSize: 18,
              color: "var(--text-2)",
              lineHeight: 1.65,
              marginBottom: 36,
              maxWidth: 520,
            }}
          >
            Send a voice note after every job. Docket turns it into a job record,
            invoice, and customer follow-up — automatically. No app to learn.
            No forms to fill.
          </p>

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <a href="#founding" className="btn-primary" style={{ fontSize: 16, padding: "15px 32px" }}>
              Claim your founding spot
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#how-it-works" className="btn-secondary">
              See how it works
            </a>
          </div>

          {/* Trust line */}
          <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-3)" }}>
            Built in Ireland &nbsp;·&nbsp; No long contracts &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </div>

      {/* Floating voice-note mockup */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "max(40px, calc(50% - 540px + 580px))",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
          opacity: 0.92,
        }}
        className="hero-mockup"
      >
        {/* Incoming voice note bubble */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px 16px 16px 4px",
            padding: "14px 18px",
            maxWidth: 280,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8, fontWeight: 500 }}>You · Voice note</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "var(--accent-dim)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <rect x="5" y="1" width="4" height="8" rx="2" fill="var(--accent)" />
                <path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="7" y1="12" x2="7" y2="13.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, height: 24, display: "flex", alignItems: "center", gap: 2 }}>
              {[4,7,5,9,6,8,5,7,4,6,8,5,7,4,6].map((h, i) => (
                <div key={i} style={{ width: 2, height: h * 2, background: "var(--accent)", borderRadius: 2, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>0:22</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8, lineHeight: 1.5 }}>
            "Done Pat's roof on Barrack St. Two roofers, full day, 40 slates replaced, lead flashing…"
          </p>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden>
            <path d="M10 0v20M4 14l6 8 6-8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          </svg>
        </div>

        {/* Docket response */}
        <div
          style={{
            background: "var(--accent)",
            borderRadius: "16px 16px 4px 16px",
            padding: "14px 18px",
            maxWidth: 280,
            boxShadow: "0 4px 24px var(--accent-glow)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontWeight: 500 }}>Docket · 62 seconds later</div>
          <p style={{ fontSize: 13, color: "white", lineHeight: 1.5 }}>
            ✅ Job logged — Pat's Roof, Barrack St<br />
            📄 Invoice #0047 sent to pat@example.com<br />
            💬 &quot;Hi Pat, invoice sent. €1,650 due in 14 days.&quot;
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-mockup { display: none !important; }
        }
      `}</style>
    </section>
  );
}
