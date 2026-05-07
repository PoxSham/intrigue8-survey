"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: scrolled
          ? "rgba(247,246,244,0.95)"
          : "rgba(247,246,244,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 18, paddingBottom: 18 }}>
        {/* Logo */}
        <a
          href="#"
          style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "1px",
            color: "var(--text-1)",
            textDecoration: "none",
          }}
        >
          INTRIGUE<span style={{ color: "var(--accent)" }}>8</span>
        </a>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a
            href="#how-it-works"
            style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)", textDecoration: "none" }}
          >
            How it works
          </a>
          <a
            href="#roadmap"
            style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)", textDecoration: "none" }}
          >
            Roadmap
          </a>
          <a
            href="#founding"
            className="btn-primary"
            style={{ padding: "8px 18px", fontSize: 13, borderRadius: 6 }}
          >
            Founding offer
          </a>
        </nav>
      </div>
      {/* Circuit trace bar */}
      <svg
        aria-hidden
        viewBox="0 0 1080 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: 36 }}
      >
        <line x1="0" y1="1" x2="1080" y2="1" stroke="#e5e7eb" strokeWidth="1"/>
        <line x1="0" y1="18" x2="1080" y2="18" stroke="#0d9488" strokeWidth="1.5" opacity="0.32"/>
        <line x1="0" y1="8" x2="340" y2="8" stroke="#0d9488" strokeWidth="0.8" opacity="0.16"/>
        <line x1="740" y1="8" x2="1080" y2="8" stroke="#0d9488" strokeWidth="0.8" opacity="0.16"/>
        <line x1="0" y1="28" x2="300" y2="28" stroke="#0369a1" strokeWidth="0.8" opacity="0.13"/>
        <line x1="780" y1="28" x2="1080" y2="28" stroke="#0369a1" strokeWidth="0.8" opacity="0.13"/>
        <line x1="80" y1="8" x2="80" y2="28" stroke="#0d9488" strokeWidth="1" opacity="0.22"/>
        <circle cx="80" cy="18" r="2.5" fill="#0d9488" opacity="0.45"/>
        <line x1="340" y1="8" x2="340" y2="18" stroke="#0d9488" strokeWidth="1" opacity="0.18"/>
        <circle cx="340" cy="8" r="2" fill="#0d9488" opacity="0.3"/>
        <rect x="504" y="12" width="72" height="12" rx="2" fill="none" stroke="#0d9488" strokeWidth="1.2" opacity="0.42"/>
        <circle cx="504" cy="18" r="3" fill="#0d9488" opacity="0.5"/>
        <circle cx="576" cy="18" r="3" fill="#0d9488" opacity="0.5"/>
        <line x1="468" y1="18" x2="504" y2="18" stroke="#0d9488" strokeWidth="1.2" opacity="0.35"/>
        <line x1="576" y1="18" x2="612" y2="18" stroke="#0d9488" strokeWidth="1.2" opacity="0.35"/>
        <text x="540" y="21" fontFamily="monospace" fontSize="6" fill="#0d9488" textAnchor="middle" opacity="0.5">I8·SYS</text>
        <line x1="740" y1="8" x2="740" y2="18" stroke="#0d9488" strokeWidth="1" opacity="0.18"/>
        <circle cx="740" cy="8" r="2" fill="#0d9488" opacity="0.3"/>
        <line x1="1000" y1="8" x2="1000" y2="28" stroke="#0d9488" strokeWidth="1" opacity="0.22"/>
        <circle cx="1000" cy="18" r="2.5" fill="#0d9488" opacity="0.45"/>
        <line x1="160" y1="15" x2="160" y2="21" stroke="#0d9488" strokeWidth="1" opacity="0.22"/>
        <line x1="240" y1="15.5" x2="240" y2="20.5" stroke="#0d9488" strokeWidth="0.8" opacity="0.16"/>
        <line x1="840" y1="15" x2="840" y2="21" stroke="#0d9488" strokeWidth="1" opacity="0.22"/>
        <line x1="920" y1="15.5" x2="920" y2="20.5" stroke="#0d9488" strokeWidth="0.8" opacity="0.16"/>
        <rect x="3" y="5" width="7" height="7" rx="1.5" fill="none" stroke="#0d9488" strokeWidth="1" opacity="0.25"/>
        <rect x="1070" y="5" width="7" height="7" rx="1.5" fill="none" stroke="#0d9488" strokeWidth="1" opacity="0.25"/>
        <line x1="0" y1="18" x2="1080" y2="18" stroke="#0d9488" strokeWidth="1.5" opacity="0.28" strokeDasharray="80 1000">
          <animate attributeName="strokeDashoffset" from="500" to="0" dur="6s" repeatCount="indefinite"/>
        </line>
      </svg>
    </header>
  );
}
