// src/customSections/HeroSection.tsx
import { useEffect, useRef, forwardRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Palette */
export const COLORS = {
  BG: "#060916",
  GLASS: "rgba(8, 12, 24, 0.55)",
  BORDER: "rgba(255,255,255,0.10)",
  PRIMARY: "#00E5FF",
  ACCENT: "#7C3AED",
  ACCENT2: "#FF3D81",
  TEXT: "#E6F1FF",
  SUBTLE: "#9AB0C5",
};

/* BG mit forwardRef (ein Ref aufs SVG) */
const NeonGridBG = forwardRef<SVGSVGElement, {}>(function NeonGridBG(_, ref) {
  return (
    <svg
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path
            d="M 36 0 L 0 0 0 36"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
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

      <g data-el="grid">
        <rect x="-100" y="-100" width="140%" height="140%" fill="url(#grid)" />
      </g>

      <g
        data-el="ring"
        style={{ mixBlendMode: "screen", transformOrigin: "50% 40%" }}
        filter="url(#blur40)"
      >
        <circle cx="22%" cy="30%" r="260" fill="url(#ring)" />
      </g>

      <g data-el="stars" style={{ mixBlendMode: "screen" }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <circle
            key={i}
            cx={`${5 + Math.random() * 90}%`}
            cy={`${10 + Math.random() * 80}%`}
            r={Math.random() * 1.7 + 0.5}
            fill={i % 2 ? COLORS.PRIMARY : COLORS.ACCENT}
            opacity="0.3"
          />
        ))}
      </g>

      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="url(#ring)"
        opacity="0.15"
      />
    </svg>
  );
});

/* Features */
function FuturisticFeatures() {
  const items: Array<[string, string]> = [
    ["Realtime parsing", COLORS.PRIMARY],
    ["Adaptive cards", COLORS.ACCENT],
    ["Exam templates", COLORS.ACCENT2],
    ["STEM-ready LaTeX", COLORS.PRIMARY],
  ];
  return (
    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(([label, color], i) => (
        <div
          key={i}
          className="feature-card relative rounded-xl px-4 py-3 text-sm font-semibold"
          style={{
            background: "rgba(8,12,24,0.45)",
            border: `1px solid ${COLORS.BORDER}`,
            boxShadow: `inset 0 0 0 1px ${color}22`,
          }}
        >
          <span
            className="absolute -top-3 left-4 h-6 rounded-full px-3 inline-flex items-center text-xs"
            style={{
              background: `${color}22`,
              color,
              border: `1px solid ${color}44`,
              backdropFilter: "blur(6px)",
            }}
          >
            FUTURE
          </span>
          <span style={{ color: COLORS.SUBTLE }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/* Hero */
export default function HeroSection() {
  // Struktur
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const bgSvgRef = useRef<SVGSVGElement | null>(null);

  // Einzelknoten aus dem SVG
  const gridRef = useRef<SVGGElement | null>(null);
  const ringRef = useRef<SVGGElement | null>(null);
  const starsRef = useRef<SVGGElement | null>(null);

  // Content
  const titleTopRef = useRef<HTMLHeadingElement | null>(null);
  const titleShimmerRef = useRef<HTMLSpanElement | null>(null);
  const ctaPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const ctaSecondaryRef = useRef<HTMLButtonElement | null>(null);

  // Visuals
  const uploadWrapRef = useRef<HTMLDivElement | null>(null);



  // Features
  const featuresRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // SVG Teile cachen
      const svg = bgSvgRef.current;
      gridRef.current =
        svg?.querySelector<SVGGElement>('[data-el="grid"]') ?? null;
      ringRef.current =
        svg?.querySelector<SVGGElement>('[data-el="ring"]') ?? null;
      starsRef.current =
        svg?.querySelector<SVGGElement>('[data-el="stars"]') ?? null;

      // Helpers
      const toIf = (
        t: gsap.TweenTarget | null | undefined,
        vars: gsap.TweenVars
      ) => {
        if (t) gsap.to(t, vars);
      };
      const fromToIf = (
        t: gsap.TweenTarget | null | undefined,
        a: gsap.TweenVars,
        b: gsap.TweenVars
      ) => {
        if (t) gsap.fromTo(t, a, b);
      };

      // Card intro + pulse
      gsap.set(cardRef.current, {
        opacity: 0,
        scale: 0.98,
        filter: "blur(6px)",
      });
      toIf(cardRef.current, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.9,
        ease: "power3.out",
      });
      toIf(cardRef.current, {
        boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 60px 10px ${COLORS.PRIMARY}33`,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // BG anims
      toIf(gridRef.current, {
        x: 28,
        y: -20,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      fromToIf(
        ringRef.current,
        { scale: 0.95, rotate: -2 },
        {
          scale: 1.05,
          rotate: 2,
          duration: 6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "50% 40%",
        }
      );
      if (starsRef.current) {
        const s = starsRef.current.querySelectorAll("circle");
        gsap.to(s, {
          opacity: (i: number) => 0.25 + (i % 5) * 0.12,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: { each: 0.06, from: "random" },
        });
      }

      // Headline + shimmer
      gsap.set(titleTopRef.current, { y: 20, opacity: 0 });
      toIf(titleTopRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
        delay: 0.2,
      });
      if (titleShimmerRef.current) {
        gsap.set(titleShimmerRef.current, {
          backgroundSize: "200% 100%",
          backgroundPosition: "0% 0%",
        });
        toIf(titleShimmerRef.current, {
          backgroundPosition: "200% 0%",
          duration: 2.8,
          ease: "power2.inOut",
          repeat: -1,
          repeatDelay: 0.6,
        });
      }

      // Docs intro + idle bob
     

      // Features stagger
      if (featuresRef.current) {
        const cards = featuresRef.current.querySelectorAll(".feature-card");
        gsap.from(cards, {
          y: 24,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.07,
          delay: 0.25,
        });
      }

      // Mouse-Parallax (Scope)
      const onMove = (e: MouseEvent) => {
        const root = scopeRef.current;
        if (!root) return;
        const r = root.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;

        toIf(uploadWrapRef.current, {
          x: dx * 24,
          y: dy * 24,
          rotate: dx * 4,
          duration: 0.6,
          ease: "power3.out",
        });
       
        toIf(ringRef.current, {
          x: dx * 18,
          y: dy * 12,
          duration: 0.8,
          ease: "sine.out",
        });
      };
      scopeRef.current?.addEventListener("mousemove", onMove);

      // --- NEW: Hover auf das Upload-SVG -> Cards langsam nach unten
      
      // hover on the whole section/card instead of only the SVG
  

      // Magnetic Buttons
      const makeMagnetic = (btn: HTMLButtonElement | null) => {
        if (!btn) return () => {};
        const enter = () =>
          toIf(btn, { scale: 1.06, duration: 0.25, ease: "power2.out" });
        const leave = () =>
          toIf(btn, {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.35,
            ease: "power3.out",
          });
        const move = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          toIf(btn, {
            x: dx * 12,
            y: dy * 10,
            duration: 0.25,
            ease: "power3.out",
          });
        };
        btn.addEventListener("mouseenter", enter);
        btn.addEventListener("mouseleave", leave);
        btn.addEventListener("mousemove", move);
        return () => {
          btn.removeEventListener("mouseenter", enter);
          btn.removeEventListener("mouseleave", leave);
          btn.removeEventListener("mousemove", move);
        };
      };
      const cleanupMag1 = makeMagnetic(ctaPrimaryRef.current);
      const cleanupMag2 = makeMagnetic(ctaSecondaryRef.current);

      // Scroll-Parallax
      toIf(uploadWrapRef.current, {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: cardRef.current!,
          start: "top top",
          end: "bottom top",
          scrub: 0.3,
        },
      });

      return () => {
        scopeRef.current?.removeEventListener("mousemove", onMove);
        
        
        cleanupMag1 && cleanupMag1();
        cleanupMag2 && cleanupMag2();
      };
    }, scopeRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      className="relative pt-28 pb-28"
      style={{ backgroundColor: COLORS.BG, color: COLORS.TEXT }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div
          ref={cardRef}
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Animated BG */}
          <NeonGridBG ref={bgSvgRef} />

          <div
            ref={scopeRef}
            className="relative z-10 px-6 py-12 sm:px-12 lg:px-16"
          >
            <div className="flex flex-col lg:flex-row items-center justify-between gap-14">
              {/* Text */}
              <div className="w-full lg:w-1/2">
                <h1
                  ref={titleTopRef}
                  className="text-[38px] sm:text-[54px] leading-tight font-extrabold tracking-tight mb-2"
                >
                  The future of learning.
                </h1>
                <h2
                  className="text-[28px] sm:text-[42px] font-black leading-tight mb-4"
                  style={{ lineHeight: 1.1 }}
                >
                  <span
                    ref={titleShimmerRef}
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      display: "inline-block",
                    }}
                  >
                    Flashcards & exams from PDFs.
                  </span>
                </h2>

                <p className="text-lg mb-8" style={{ color: COLORS.SUBTLE }}>
                  Upload. Generate. Retain. A glass-smooth workflow for modern
                  students.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    ref={ctaPrimaryRef}
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
                    ref={ctaSecondaryRef}
                    className="px-6 py-3 rounded-lg font-semibold"
                    style={{
                      color: COLORS.TEXT,
                      border: `1px solid ${COLORS.BORDER}`,
                      background: "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    How it works
                  </button>
                </div>
              </div>

              {/* Visuals */}
              <div className="w-full lg:w-1/2 max-w-md mx-auto">
                <div
                  ref={uploadWrapRef}
                  className="relative will-change-transform"
                >
                  {/* Hover-Target um das Upload-SVG */}
                
                  
                </div>
              </div>
            </div>

            {/* Features */}
            <div ref={featuresRef}>
              <FuturisticFeatures />
            </div>
          </div>

          {/* Bottom accent line */}
          <div
            aria-hidden
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
