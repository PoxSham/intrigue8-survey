const problems = [
  {
    emoji: "🧾",
    title: "Chasing invoices at midnight",
    body: "You finish a job, drive home, have your dinner — and then spend an hour trying to remember what to charge and who owes what.",
  },
  {
    emoji: "📋",
    title: "Jobs falling through the cracks",
    body: "No record of who told you what, what was agreed, or what needs a follow-up. It's all in your head — until it isn't.",
  },
  {
    emoji: "📱",
    title: "You don't need another app",
    body: "You've tried spreadsheets. You've tried apps. They take longer than just doing it yourself. You need something that works like you do.",
  },
];

export default function Problem() {
  return (
    <section style={{ padding: "72px 0", background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 52px" }}>
          <p className="section-label">The problem</p>
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
            Running a trade is the job.<br />
            <span className="gradient-text">The paperwork isn&apos;t.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-2)", lineHeight: 1.6 }}>
            Irish tradespeople are losing hours every week on admin that should take minutes.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {problems.map((p) => (
            <div
              key={p.title}
              className="card"
              style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 24 }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{p.emoji}</div>
              <h3
                style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text-1)",
                  marginBottom: 8,
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.6 }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Stats bar — all figures from published Irish research */}
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 1,
            background: "var(--border)",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          {[
            {
              stat: "9 hrs/week",
              label: "spent on admin by Irish SMEs",
              source: "HRLocker, 2025",
            },
            {
              stat: "58%",
              label: "of Irish businesses hit by late payments",
              source: "Enterprise Nation, 2024",
            },
            {
              stat: "60+ days",
              label: "average time to get paid in Ireland",
              source: "Atradius Payment Report",
            },
          ].map((item) => (
            <div
              key={item.stat}
              style={{ background: "var(--surface)", padding: "28px 24px", textAlign: "center" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--accent)",
                  marginBottom: 4,
                }}
              >
                {item.stat}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }}>{item.source}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
