"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Do I need a smartphone or any special equipment?",
    a: "Just a phone with WhatsApp — which you almost certainly already have. That's it. No apps to download, no logins, no setup beyond a 5-minute onboarding call with Adam.",
  },
  {
    q: "What if I'm not great with technology?",
    a: "Docket is specifically built for tradespeople who don't want to deal with technology. If you can send a voice note on WhatsApp (which is just pressing and holding a button), you can use Docket. There's nothing else to learn.",
  },
  {
    q: "How does the invoicing actually work?",
    a: "You describe the job in your voice note — who it was for, what you did, any materials. Docket pulls out the details and sends a professional PDF invoice to your customer's email. You review it via WhatsApp before it goes out if you prefer.",
  },
  {
    q: "What about customers who don't have email?",
    a: "SMS invoicing is on the roadmap for Phase 2. In the meantime, Docket sends payment reminders by SMS even when invoices go by email.",
  },
  {
    q: "Is my data secure? Who can see my jobs?",
    a: "Your data is stored on EU servers and nobody else sees it. It's your business information — Intrigue8 never shares it or uses it for anything other than running your account.",
  },
  {
    q: "What happens if I want to cancel?",
    a: "Cancel any time, no questions asked. No minimum term, no exit fees. Your data is exportable on request.",
  },
  {
    q: "If I trial it and like it — is €49.99/month really locked forever?",
    a: "Yes. Trial users who choose to continue pay €49.99/month for as long as they're a customer. When we open publicly at €149/month, your price never changes. That's the whole point of getting in early.",
  },
  {
    q: "What happens after the 30-day trial?",
    a: "Adam will check in with you at the end of the trial. If it's saved you time and you want to keep going, you lock in at €49.99/month. If it hasn't worked for you, you walk away — no charge, no obligation.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section style={{ padding: "80px 0" }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
          {/* Left col */}
          <div style={{ position: "sticky", top: 120 }}>
            <p className="section-label">FAQ</p>
            <h2
              style={{
                fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                fontSize: "clamp(26px, 3.5vw, 36px)",
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: "var(--text-1)",
                marginBottom: 16,
              }}
            >
              Still have questions?
            </h2>
            <p style={{ fontSize: 16, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 28 }}>
              If something isn&apos;t answered here, WhatsApp Adam directly. He&apos;s the one building this and he actually picks up.
            </p>
            <a
              href="https://wa.me/353861234567"
              className="btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8c0 1.18.32 2.29.87 3.24L1.5 14.5l3.32-.85A6.47 6.47 0 008 14.5c3.59 0 6.5-2.91 6.5-6.5S11.59 1.5 8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              WhatsApp Adam
            </a>
          </div>

          {/* Right col — accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid",
                  borderColor: open === i ? "rgba(13,148,136,0.3)" : "var(--border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                  background: open === i ? "var(--accent-dim)" : "var(--surface)",
                }}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "18px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: open === i ? "var(--accent)" : "var(--text-1)",
                  }}
                >
                  {faq.q}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {open === i && (
                  <div style={{ padding: "0 20px 18px", fontSize: 15, color: "var(--text-2)", lineHeight: 1.65 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div
          style={{
            marginTop: 80,
            background: "var(--accent)",
            borderRadius: 16,
            padding: "56px 48px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
          <h2
            style={{
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
              marginBottom: 14,
              position: "relative",
            }}
          >
            {REMAINING} free trial spots. Lock in €49.99/month forever.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.8)", marginBottom: 32, position: "relative" }}>
            When we open to everyone else, it&apos;s €149/month. Trial users pay nothing for 30 days.
          </p>
          <a
            href="#trial"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "white",
              color: "var(--accent)",
              fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              padding: "15px 32px",
              borderRadius: 8,
              textDecoration: "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              position: "relative",
            }}
          >
            Apply for a free trial spot
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          section > .wrap > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  );
}

const REMAINING = 3;
