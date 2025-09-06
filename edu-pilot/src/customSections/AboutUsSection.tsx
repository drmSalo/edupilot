// src/customSections/AboutUsSection.tsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COLORS } from "./HeroSection";

gsap.registerPlugin(ScrollTrigger);

export default function AboutUsSection() {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const underlineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Headline + Subtext
      gsap.set(headingRef.current, { y: 24, opacity: 0, filter: "blur(4px)" });
      gsap.set(subRef.current, { y: 18, opacity: 0, filter: "blur(4px)" });
      gsap.to(headingRef.current, {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: scopeRef.current,
          start: "top 78%",
          once: true,
        },
      });
      gsap.to(subRef.current, {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.65,
        ease: "power3.out",
        delay: 0.08,
        scrollTrigger: {
          trigger: scopeRef.current,
          start: "top 78%",
          once: true,
        },
      });

      // Underline sweep
      if (underlineRef.current) {
        gsap.set(underlineRef.current, { scaleX: 0, transformOrigin: "0% 50%" });
        gsap.to(underlineRef.current, {
          scaleX: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: scopeRef.current,
            start: "top 78%",
            once: true,
          },
        });
      }

      // Cards stagger in
      const cards = scopeRef.current?.querySelectorAll<HTMLDivElement>(".about-card");
      if (cards && cards.length) {
        gsap.from(cards, {
          y: 28,
          opacity: 0,
          rotateX: -8,
          transformPerspective: 600,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: scopeRef.current,
            start: "top 70%",
            once: true,
          },
        });

        // Subtiler Parallax beim Scrollen
        cards.forEach((card, idx) => {
          gsap.to(card, {
            y: idx % 2 === 0 ? -10 : -4,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.4,
            },
          });
        });

        // 3D Tilt + Glow auf Hover
        cards.forEach((card) => {
          const glow = card.querySelector<HTMLElement>(".about-glow");
          const onMove = (e: MouseEvent) => {
            const r = card.getBoundingClientRect();
            const relX = (e.clientX - r.left) / r.width;  // 0..1
            const relY = (e.clientY - r.top) / r.height;  // 0..1
            const rotX = (0.5 - relY) * 8;                // -4..4
            const rotY = (relX - 0.5) * 10;               // -5..5
            gsap.to(card, { rotateX: rotX, rotateY: rotY, z: 8, duration: 0.25, ease: "power3.out", transformPerspective: 800 });
            if (glow) {
              gsap.to(glow, {
                opacity: 0.65,
                x: (relX - 0.5) * 40,
                y: (relY - 0.5) * 40,
                duration: 0.25,
                ease: "power3.out",
              });
            }
          };
          const onLeave = () => {
            gsap.to(card, { rotateX: 0, rotateY: 0, z: 0, duration: 0.4, ease: "power3.out" });
            if (glow) gsap.to(glow, { opacity: 0.0, x: 0, y: 0, duration: 0.35, ease: "power2.out" });
          };
          card.addEventListener("mousemove", onMove);
          card.addEventListener("mouseleave", onLeave);
          // Cleanup
          (card as any).__cleanup = () => {
            card.removeEventListener("mousemove", onMove);
            card.removeEventListener("mouseleave", onLeave);
          };
        });
      }
    }, scopeRef);

    return () => {
      // Cleanup Hover-Listener pro Card
      const cards = scopeRef.current?.querySelectorAll<HTMLDivElement>(".about-card");
      cards?.forEach((c: any) => c.__cleanup && c.__cleanup());
      ctx.revert();
    };
  }, []);

  const items: Array<{ title: string; desc: string }> = [
    { title: "Faster prep", desc: "Short, focused outputs. No fluff." },
    { title: "Better retention", desc: "Active recall built-in: cards & quizzes." },
    { title: "Actionable insights", desc: "What to learn next, based on gaps." },
  ];

  return (
    <section ref={scopeRef} className="py-20" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4">
          <h2 ref={headingRef} className="text-3xl sm:text-4xl font-bold">Why Edu Pilot</h2>
          <div
            ref={underlineRef}
            className="mt-2 h-[3px] w-full rounded"
            style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }}
          />
        </div>

        <p ref={subRef} className="text-lg mb-10" style={{ color: COLORS.SUBTLE }}>
          We compress hours of reading into minutes of active recall. Built with a future-first stack.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((t) => (
            <div
              key={t.title}
              className="about-card relative rounded-xl p-6 will-change-transform"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)",
                boxShadow: `0 10px 30px -20px rgba(0,0,0,0.7), inset 0 0 0 1px ${COLORS.PRIMARY}11`,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Glow layer (animiert per GSAP) */}
              <div
                className="about-glow pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  background: `radial-gradient(400px 260px at 50% 50%, ${COLORS.PRIMARY}33, transparent 60%)`,
                  opacity: 0,
                  mixBlendMode: "screen",
                  filter: "blur(14px)",
                }}
              />

              <div className="text-xl font-semibold mb-2">{t.title}</div>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                {t.desc}
              </p>

              {/* Bottom accent line */}
              <div
                aria-hidden
                className="absolute left-0 right-0 bottom-0 h-[2px]"
                style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
