const phases = [
  {
    phase: "Phase 1",
    label: "Now in trial with first users",
    status: "live",
    items: [
      "WhatsApp voice note → job record in 60 seconds",
      "Automatic invoice sent to customer by email",
      "Customer SMS notifications",
      "Overdue payment follow-ups (7, 14, 30 days)",
      "WhatsApp AI assistant — ask anything about your jobs",
      "Weekly job & payment briefing",
    ],
  },
  {
    phase: "Phase 2",
    label: "Q3 2026",
    status: "upcoming",
    items: [
      "Quote builder — voice a quote, send it in seconds",
      "Customer portal — they accept quotes, view invoices online",
      "Before/after photo portfolio from WhatsApp media",
      "Job profitability tracking (passive, no timesheets)",
      "Warranty expiry reminders → rebooking prompts",
    ],
  },
  {
    phase: "Phase 3",
    label: "Q4 2026",
    status: "planned",
    items: [
      "Subcontractor payment tracking",
      "Materials cost logging",
      "Seasonal demand forecasting",
      "Weather-aware scheduling nudges",
      "Full contractor dashboard (web app)",
    ],
  },
];

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  live: { bg: "rgba(13,148,136,0.1)", color: "var(--accent)", label: "◎ In trial" },
  upcoming: { bg: "rgba(99,102,241,0.08)", color: "#6366f1", label: "◎ Coming soon" },
  planned: { bg: "rgba(100,116,139,0.08)", color: "var(--text-3)", label: "○ Planned" },
};

export default function Roadmap() {
  return (
    <section id="roadmap" style={{ padding: "80px 0", background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 540, margin: "0 auto 56px" }}>
          <p className="section-label">Roadmap</p>
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
            Built in public.{" "}
            <span className="gradient-text">You help shape it.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.6 }}>
            Founding members get early access to every new feature and a direct line to suggest what gets built next.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {phases.map((p) => {
            const s = statusStyles[p.status];
            return (
              <div
                key={p.phase}
                className="card"
                style={{
                  borderTop: p.status === "live" ? "3px solid var(--accent)" : "3px solid var(--border)",
                  opacity: p.status === "planned" ? 0.75 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-3)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      {p.phase}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}>
                      {p.label}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 100,
                      background: s.bg,
                      color: s.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.items.map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 14,
                        color: "var(--text-2)",
                        lineHeight: 1.5,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                        style={{ flexShrink: 0, marginTop: 2 }}
                      >
                        <circle cx="8" cy="8" r="7" stroke={p.status === "live" ? "var(--accent)" : "var(--border)"} strokeWidth="1.5" />
                        {p.status === "live" && (
                          <path d="M5 8l2 2 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
