const steps = [
  {
    num: "01",
    title: "Finish the job. Send a voice note.",
    body: "On the drive home, send a 30-second voice note on WhatsApp. Describe what you did, who it was for, any materials. That's it.",
    detail: "No app to open. No form to fill. You already have WhatsApp.",
  },
  {
    num: "02",
    title: "Docket listens, logs, and invoices.",
    body: "In under 60 seconds, Docket transcribes your note, extracts the job details, creates a record, and sends a professional invoice to your customer.",
    detail: "Labour, materials, customer name, address — all pulled automatically.",
  },
  {
    num: "03",
    title: "Customer gets chased. You don't have to.",
    body: "Docket sends polite payment reminders at 7 days, 14 days, and 30 days. Overdue jobs surface in your weekly briefing so nothing falls through.",
    detail: "Sent via SMS — no apps needed on the customer's end either.",
  },
  {
    num: "04",
    title: "Ask anything. Get a real answer.",
    body: "\"How much did Murphy's job come to?\" \"What's outstanding this month?\" Your AI assistant knows every job you've ever logged.",
    detail: "Just WhatsApp the question. No dashboards. No logins.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "80px 0" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 60px" }}>
          <p className="section-label">How it works</p>
          <h2
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              marginBottom: 14,
            }}
          >
            Works exactly like{" "}
            <span className="gradient-text">texting a mate.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.6 }}>
            If you can send a WhatsApp, you can use Docket. There&apos;s nothing to learn.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                gap: 28,
                paddingBottom: 40,
                borderLeft: i < steps.length - 1 ? "2px solid var(--accent-dim)" : "2px solid transparent",
                paddingLeft: 0,
                marginLeft: 32,
              }}
            >
              {/* Number node */}
              <div style={{ marginLeft: -32, flexShrink: 0 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "var(--surface)",
                    border: "2px solid var(--accent)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--accent)",
                  }}
                >
                  {step.num}
                </div>
              </div>

              {/* Content */}
              <div style={{ paddingLeft: 12, paddingTop: 10, paddingBottom: 8 }}>
                <h3
                  style={{
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--text-1)",
                    marginBottom: 10,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 8 }}>
                  {step.body}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--accent)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
