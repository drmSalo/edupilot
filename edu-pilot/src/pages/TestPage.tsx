// HomePage.tsx — single component version
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export default function HomeTest() {
  // ---- Refs
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const explainRef = useRef<HTMLDivElement | null>(null);
  const pricingRef = useRef<HTMLDivElement | null>(null);
  const doc1Ref = useRef<HTMLDivElement | null>(null);
  const doc2Ref = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<SVGGElement | null>(null);
  const starsRef = useRef<SVGGElement | null>(null);

  // ---- Palette
  const COLORS = {
    BG: "#060916",
    GLASS: "rgba(8, 12, 24, 0.55)",
    BORDER: "rgba(255,255,255,0.10)",
    PRIMARY: "#00E5FF",
    ACCENT: "#7C3AED",
    ACCENT2: "#FF3D81",
    TEXT: "#E6F1FF",
    SUBTLE: "#9AB0C5",
  };

  // ---- Effects
  useEffect(() => {
    // Hero docs intro + idle bob
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([doc1Ref.current, doc2Ref.current], { y: -200, opacity: 0 });
    tl.to(doc1Ref.current, { y: -300, x: -60, opacity: 1, duration: 0.9 })
      .to(doc2Ref.current, { y: -260, x: 60, opacity: 1, duration: 0.9 }, "<");
    gsap.to(doc1Ref.current, { y: "-=6", duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(doc2Ref.current, { y: "+=6", duration: 4.4, repeat: -1, yoyo: true, ease: "sine.inOut" });

    // Neon grid drift
    if (gridRef.current) {
      gsap.to(gridRef.current, { x: 24, y: -16, duration: 8, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }
    // Stars twinkle
    if (starsRef.current) {
      const nodes = Array.from(starsRef.current.querySelectorAll("circle"));
      nodes.forEach((n, i) => {
        gsap.to(n, {
          opacity: 0.25 + (i % 5) * 0.1,
          duration: 2 + (i % 4),
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: i * 0.08,
        });
      });
    }
  }, []);

  // ---- Helpers
  const scrollToEl = (el: HTMLElement | null) => {
    if (!el) return;
    gsap.to(window, { duration: 0.8, scrollTo: { y: el, offsetY: 72 }, ease: "power2.out" });
  };

  return (
    <div style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(3, 6, 16, 0.6)", borderBottom: `1px solid ${COLORS.BORDER}` }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="font-black tracking-tight text-lg">
            <span
              style={{
                backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              EDU•PILOT
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <button onClick={() => gsap.to(window, { duration: 0.8, scrollTo: 0 })} className="opacity-90 hover:opacity-100">
              Home
            </button>
            <button onClick={() => scrollToEl(aboutRef.current)} className="opacity-90 hover:opacity-100">
              About
            </button>
            <button onClick={() => scrollToEl(explainRef.current)} className="opacity-90 hover:opacity-100">
              How it works
            </button>
            <button onClick={() => scrollToEl(pricingRef.current)} className="opacity-90 hover:opacity-100">
              Pricing
            </button>
          </nav>
          <button
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-md text-sm font-medium"
            style={{ border: `1px solid ${COLORS.BORDER}`, background: "rgba(255,255,255,0.02)", backdropFilter: "blur(6px)" }}
          >
            Get started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-20">
        <div className="mx-auto max-w-7xl px-4">
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              background: COLORS.GLASS,
              border: `1px solid ${COLORS.BORDER}`,
              boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Neon Grid BG (inline, no subcomponent) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                </pattern>
                <radialGradient id="ring" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor={COLORS.PRIMARY} stopOpacity="0.35" />
                  <stop offset="45%" stopColor={COLORS.ACCENT} stopOpacity="0.20" />
                  <stop offset="100%" stopColor={COLORS.ACCENT2} stopOpacity="0" />
                </radialGradient>
                <filter id="blur40">
                  <feGaussianBlur stdDeviation="40" />
                </filter>
              </defs>

              <g ref={gridRef}>
                <rect x="-100" y="-100" width="140%" height="140%" fill="url(#grid)" />
              </g>

              <g style={{ mixBlendMode: "screen" }} filter="url(#blur40)">
                <circle cx="22%" cy="30%" r="260" fill="url(#ring)" />
              </g>

              <g ref={starsRef} style={{ mixBlendMode: "screen" }}>
                {Array.from({ length: 26 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={`${5 + Math.random() * 90}%`}
                    cy={`${10 + Math.random() * 80}%`}
                    r={Math.random() * 1.5 + 0.6}
                    fill={i % 2 ? COLORS.PRIMARY : COLORS.ACCENT}
                    opacity="0.35"
                  />
                ))}
              </g>

              <rect x="0" y="0" width="100%" height="100%" fill="url(#ring)" opacity="0.15" />
            </svg>

            <div className="relative z-10 px-6 py-12 sm:px-12 lg:px-16">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-14">
                <div className="w-full lg:w-1/2">
                  <h1 className="text-[38px] sm:text-[54px] leading-tight font-extrabold tracking-tight mb-4">
                    The future of learning.
                    <br />
                    <span
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      Flashcards & exams from PDFs.
                    </span>
                  </h1>
                  <p className="text-lg mb-8" style={{ color: COLORS.SUBTLE }}>
                    Upload. Generate. Retain. A glass-smooth workflow for modern students.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => scrollToEl(pricingRef.current)}
                      className="px-6 py-3 rounded-lg font-semibold"
                      style={{
                        color: "#00131a",
                        backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                        boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
                      }}
                    >
                      Try it now
                    </button>
                    <button
                      onClick={() => scrollToEl(explainRef.current)}
                      className="px-6 py-3 rounded-lg font-semibold"
                      style={{
                        border: `1px solid ${COLORS.BORDER}`,
                        background: "rgba(255,255,255,0.02)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      How it works
                    </button>
                  </div>
                </div>

                {/* Visuals (inline SVGs) */}
                <div className="w-full lg:w-1/2 max-w-md mx-auto">
                  <div className="relative">
                    {/* Upload SVG */}
                    <svg className="w-56 h-56" viewBox="0 0 200 200">
                      <defs>
                        <linearGradient id="uplGrad" x1="0" x2="1" y1="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.PRIMARY} />
                          <stop offset="100%" stopColor={COLORS.ACCENT} />
                        </linearGradient>
                      </defs>
                      <rect x="28" y="36" width="144" height="104" rx="14" fill="#0b1223" stroke="url(#uplGrad)" strokeWidth="3" />
                      <path d="M60 124 L100 84 L140 124" fill="none" stroke="url(#uplGrad)" strokeWidth="6" strokeLinecap="round" />
                    </svg>

                    {/* Two doc cards with refs for GSAP */}
                    <div className="absolute top-[80%] left-1/2 -translate-x-1/2 flex gap-6 justify-center w-full">
                      <div ref={doc1Ref} className="will-change-transform">
                        <svg className="w-24 h-32" viewBox="0 0 120 160">
                          <rect x="16" y="16" width="88" height="128" rx="10" fill="#e6f1ff" />
                          <rect x="28" y="40" width="64" height="8" rx="4" fill="#9bb0c6" />
                          <rect x="28" y="60" width="48" height="8" rx="4" fill="#9bb0c6" />
                          <rect x="28" y="96" width="64" height="8" rx="4" fill="#9bb0c6" />
                        </svg>
                      </div>
                      <div ref={doc2Ref} className="will-change-transform">
                        <svg className="w-24 h-32" viewBox="0 0 120 160">
                          <rect x="16" y="16" width="88" height="128" rx="10" fill="#e6f1ff" />
                          <rect x="28" y="40" width="64" height="8" rx="4" fill="#9bb0c6" />
                          <rect x="28" y="60" width="48" height="8" rx="4" fill="#9bb0c6" />
                          <rect x="28" y="96" width="64" height="8" rx="4" fill="#9bb0c6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  ["Realtime parsing", COLORS.PRIMARY],
                  ["Adaptive cards", COLORS.ACCENT],
                  ["Exam templates", COLORS.ACCENT2],
                  ["STEM-ready LaTeX", COLORS.PRIMARY],
                ].map(([label, color], i) => (
                  <div
                    key={i}
                    className="relative rounded-xl px-4 py-3 text-sm font-semibold"
                    style={{
                      background: "rgba(8,12,24,0.45)",
                      border: `1px solid ${COLORS.BORDER}`,
                      boxShadow: `inset 0 0 0 1px ${color}22`,
                    }}
                  >
                    <span
                      className="absolute -top-3 left-4 h-6 rounded-full px-3 inline-flex items-center text-xs"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}44`, backdropFilter: "blur(6px)" }}
                    >
                      FUTURE
                    </span>
                    <span style={{ color: COLORS.SUBTLE }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section ref={aboutRef} className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Edu Pilot</h2>
          <p className="text-lg mb-10" style={{ color: COLORS.SUBTLE }}>
            We compress hours of reading into minutes of active recall. Built with a future-first stack.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["Faster prep", "Better retention", "Actionable insights"].map((t, i) => (
              <div
                key={i}
                className="rounded-xl p-6"
                style={{ background: COLORS.GLASS, border: `1px solid ${COLORS.BORDER}`, backdropFilter: "blur(10px)" }}
              >
                <div className="text-xl font-semibold mb-2">{t}</div>
                <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                  Short, focused outputs. No fluff.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={explainRef} className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Upload PDF", desc: "Drop textbook, slides, notes.", color: COLORS.PRIMARY },
              { title: "Process", desc: "Parse & summarize smartly.", color: COLORS.ACCENT },
              { title: "Generate", desc: "Flashcards & exam questions.", color: COLORS.ACCENT2 },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-6"
                style={{
                  background: COLORS.GLASS,
                  border: `1px solid ${COLORS.BORDER}`,
                  backdropFilter: "blur(10px)",
                  boxShadow: `0 10px 40px -20px ${s.color}99`,
                }}
              >
                <div className="text-xl font-semibold mb-2" style={{ color: s.color }}>
                  {s.title}
                </div>
                <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="text-sm mb-6" style={{ color: COLORS.SUBTLE }}>
            Trusted by students from
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-85">
            {["Leuphana", "TUM", "ETH", "Humboldt"].map((n) => (
              <div
                key={n}
                className="px-4 py-3 rounded-lg"
                style={{ background: COLORS.GLASS, border: `1px solid ${COLORS.BORDER}`, backdropFilter: "blur(10px)" }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section ref={pricingRef} className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: "Basic", price: "Free", features: ["PDF → Summary", "Limited cards", "Community support"], prime: false },
              { name: "Prime", price: "€8/mo", features: ["All Basic", "Unlimited cards", "Exam questions", "Priority support"], prime: true },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  background: COLORS.GLASS,
                  border: `1px solid ${COLORS.BORDER}`,
                  backdropFilter: "blur(10px)",
                  boxShadow: t.prime ? `0 10px 50px -20px ${COLORS.PRIMARY}` : undefined,
                }}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <div className="text-xl font-semibold">{t.name}</div>
                  <div className="text-2xl font-black" style={{ color: t.prime ? COLORS.PRIMARY : COLORS.TEXT }}>
                    {t.price}
                  </div>
                </div>
                <ul className="space-y-2 mb-6" style={{ color: COLORS.SUBTLE }}>
                  {t.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button
                  className="mt-auto px-5 py-3 rounded-lg font-semibold self-start"
                  style={{
                    background: t.prime ? `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})` : "rgba(255,255,255,0.02)",
                    color: t.prime ? "#00131a" : COLORS.TEXT,
                    border: t.prime ? "none" : `1px solid ${COLORS.BORDER}`,
                  }}
                >
                  Choose {t.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t" style={{ borderColor: COLORS.BORDER, color: COLORS.SUBTLE }}>
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} Edu Pilot</div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:opacity-90">Privacy</a>
            <a href="#" className="hover:opacity-90">Terms</a>
            <a href="#" className="hover:opacity-90">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
