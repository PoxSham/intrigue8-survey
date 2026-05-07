export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 0" }}>
      <div className="wrap">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text-1)",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  background: "var(--accent)",
                  borderRadius: 5,
                  color: "white",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                i8
              </span>
              Docket by Intrigue8
            </div>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              Built in Tuam, Co. Galway, Ireland.
            </p>
          </div>

          <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
            <a
              href="mailto:adam@intrigue8.ie"
              style={{ fontSize: 13, color: "var(--text-2)", textDecoration: "none" }}
            >
              adam@intrigue8.ie
            </a>
            <a
              href="#"
              style={{ fontSize: 13, color: "var(--text-2)", textDecoration: "none" }}
            >
              Privacy
            </a>
            <a
              href="#founding"
              className="btn-primary"
              style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6 }}
            >
              Claim your spot
            </a>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-3)",
          }}
        >
          © {new Date().getFullYear()} Intrigue8. Docket is a product of Intrigue8.
          &nbsp;·&nbsp; Founding member pricing (€49/month) is locked for the lifetime of your subscription.
          &nbsp;·&nbsp; VAT not included where applicable.
        </div>
      </div>
    </footer>
  );
}
