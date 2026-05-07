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
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "0.5px",
            color: "var(--text-1)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              background: "var(--accent)",
              borderRadius: 6,
              color: "white",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            i8
          </span>
          <span>
            <span style={{ color: "var(--text-1)" }}>Intrigue</span>
            <span style={{ color: "var(--accent)" }}>8</span>
          </span>
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
    </header>
  );
}
