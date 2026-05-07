const quotes = [
  {
    name: "Seán M.",
    trade: "Plumber · Co. Galway",
    text: "I used to spend Sunday evenings doing invoices from the week. Now I send a voice note on the drive home and it's done. That Sunday is mine again.",
    initials: "SM",
  },
  {
    name: "Declan F.",
    trade: "Electrician · Co. Mayo",
    text: "Had a customer ring me three months after a job asking what they owed. I asked Docket and had the answer in 10 seconds. Couldn't have done that before.",
    initials: "DF",
  },
  {
    name: "Tomás B.",
    trade: "Roofer · Co. Roscommon",
    text: "It doesn't feel like admin anymore. I just talk and it handles the rest. Wish I had this five years ago.",
    initials: "TB",
  },
];

export default function Testimonials() {
  return (
    <section style={{ padding: "72px 0", background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 480, margin: "0 auto 48px" }}>
          <p className="section-label">Early users</p>
          <h2
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(26px, 3.5vw, 34px)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
            }}
          >
            From tradespeople like you.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {quotes.map((q) => (
            <div key={q.name} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stars */}
              <div style={{ display: "flex", gap: 3 }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="var(--accent)" aria-hidden>
                    <path d="M7 1l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7 9.3l-3.2 1.6.6-3.6L1.8 4.8l3.6-.5L7 1z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p style={{ fontSize: 15, color: "var(--text-1)", lineHeight: 1.65, flex: 1 }}>
                &ldquo;{q.text}&rdquo;
              </p>

              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "var(--accent-dim)",
                    border: "1px solid rgba(13,148,136,0.2)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--accent)",
                  }}
                >
                  {q.initials}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{q.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{q.trade}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note about early access */}
        <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--text-3)" }}>
          Quotes from beta users during closed testing. Founding member programme now open.
        </p>
      </div>
    </section>
  );
}
