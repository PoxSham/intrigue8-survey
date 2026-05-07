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
            3 free trial spots — lock in at{" "}
            <span style={{ fontWeight: 800 }}>€49.99/month forever</span>
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
            <a href="#trial" className="btn-primary" style={{ fontSize: 16, padding: "15px 32px" }}>
              Apply for a free trial spot
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

      {/* i8 mark — the brand graphic from the original site */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/i8-mark.png"
        alt=""
        aria-hidden
        className="hero-mark"
        style={{
          position: "absolute",
          right: -100,
          bottom: -40,
          width: 520,
          height: 520,
          objectFit: "contain",
          zIndex: 0,
          pointerEvents: "none",
          mixBlendMode: "multiply",
          opacity: 0.92,
          WebkitMaskImage: "radial-gradient(ellipse 75% 80% at 58% 52%, black 35%, transparent 72%)",
          maskImage: "radial-gradient(ellipse 75% 80% at 58% 52%, black 35%, transparent 72%)",
        }}
      />

      <style>{`
        @media (max-width: 768px) {
          .hero-mark { right: -180px !important; bottom: -60px !important; width: 380px !important; height: 460px !important; }
        }
        @media (max-width: 480px) {
          .hero-mark { opacity: 0.2 !important; right: -160px !important; width: 320px !important; height: 390px !important; }
        }
      `}</style>
    </section>
  );
}
