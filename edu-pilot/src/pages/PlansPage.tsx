import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function PlansPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // Cleanup für Hover-Handler
  const moveHandlersRef = useRef<Map<HTMLDivElement, (e: MouseEvent) => void>>(new Map());

  const plans = [
    {
      name: "Basic",
      price: "Free",
      features: ["PDF to Summary", "Project Saving", "Rename/Delete Projects"],
      highlight: false,
    },
    {
      name: "Prime",
      price: "15.00€ / month",
      features: [
        "Everything in Basic",
        "Generate Study Cards",
        "Generate Tests/Quizzes",
        "Priority AI Model",
      ],
      highlight: true,
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Aura Pulse
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.2,
          opacity: 0.8,
          duration: 3,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }

      // Intro: Titel/Sub
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (titleRef.current) {
        tl.fromTo(
          titleRef.current,
          { y: 40, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8 }
        );
      }
      if (subtitleRef.current) {
        tl.fromTo(
          subtitleRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.3"
        );
      }

      // Cards pop-in – NUR wenn vorhanden
      const cardEls = cardsRef.current.filter(Boolean) as HTMLDivElement[];
      if (cardEls.length) {
        tl.fromTo(
          cardEls,
          { y: 60, rotateX: -10, opacity: 0, scale: 0.96, transformOrigin: "center 100%" },
          { y: 0, rotateX: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.12 },
          "-=0.2"
        );
      }

      // Parallax
      gsap.to("[data-parallax='title']", {
        yPercent: -10,
        scrollTrigger: { trigger: rootRef.current, start: "top top", scrub: 0.5 },
      });
      gsap.to("[data-parallax='grid']", {
        yPercent: 6,
        scrollTrigger: { trigger: rootRef.current, start: "top top", scrub: 0.5 },
      });

      // Hover-Light je Card (+ Fallback für CSS-Variablen)
      cardEls.forEach((el) => {
        const old = moveHandlersRef.current.get(el);
        if (old) {
          el.removeEventListener("mousemove", old);
          moveHandlersRef.current.delete(el);
        }
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          el.style.setProperty("--mx", `${x}px`);
          el.style.setProperty("--my", `${y}px`);
        };
        // Beim Mount setzt du Mittelwert, damit Gradient valide ist:
        el.style.setProperty("--mx", `50%`);
        el.style.setProperty("--my", `50%`);
        el.addEventListener("mousemove", onMove);
        moveHandlersRef.current.set(el, onMove);
      });
    }, rootRef);

    return () => {
      ctx.revert();
      moveHandlersRef.current.forEach((fn, el) => el.removeEventListener("mousemove", fn));
      moveHandlersRef.current.clear();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-black text-white overflow-hidden"
      style={{ isolation: "isolate" }} // eigener Stacking-Context, Content bleibt oben
    >
      {/* Aura */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[60rem] w-[60rem] rounded-full blur-3xl opacity-60 -z-20"
        style={{
          background:
            "radial-gradient(closest-side, rgba(199,240,34,0.18), rgba(0,0,0,0.0))",
        }}
      />

      {/* Grid (hinter allem) */}
      <div
        data-parallax="grid"
        className="pointer-events-none absolute inset-0 opacity-[0.08] -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px, 64px 64px",
        }}
      />

      {/* Header */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 pt-24 md:pt-28 text-center">
        <h1
          ref={titleRef}
          data-parallax="title"
          className="text-5xl md:text-6xl font-black tracking-tight mb-4 text-[#c7f022] drop-shadow-[0_0_30px_rgba(199,240,34,0.35)]"
        >
          Choose Your Plan
        </h1>
        <p ref={subtitleRef} className="text-gray-300 max-w-2xl mx-auto mb-14">
          Whether you’re just getting started or want full access to EduPilot’s AI tools — we’ve got a plan for you.
        </p>
      </div>

      {/* Cards */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              ref={(el: HTMLDivElement | null) => {
                cardsRef.current[idx] = el;
              }}
              className={`group relative border-2 rounded-2xl p-8 md:p-10 shadow-2xl transition will-change-transform
                ${
                  plan.highlight
                    ? "border-[#c7f022]/70 bg-[#0c0c0c]"
                    : "border-white/10 bg-[#121212]"
                }
                hover:scale-[1.02] hover:-translate-y-1`}
              style={{
                backgroundImage:
                  // Fallback-Center, falls --mx/--my noch nicht gesetzt
                  "radial-gradient(120px 120px at var(--mx, 50%) var(--my, 50%), rgba(199,240,34,0.08), transparent 40%)",
              }}
            >
              {/* Accent ring on hover */}
              <div
                className={`pointer-events-none absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 blur
                ${plan.highlight ? "bg-[#c7f022]/25" : "bg-white/10"}`}
              />

              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl md:text-3xl font-extrabold">{plan.name}</h2>
                  {plan.highlight && (
                    <span className="text-[10px] uppercase tracking-widest bg-[#c7f022] text-black px-3 py-1 rounded-full font-bold">
                      Popular
                    </span>
                  )}
                </div>

                <p className="text-4xl md:text-5xl font-black text-[#c7f022] mb-8">{plan.price}</p>

                <ul className="text-left space-y-3 mb-10">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-200">
                      <span className="text-[#c7f022] text-xl">✔</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3.5 rounded-xl font-semibold transition relative overflow-hidden
                    ${
                      plan.highlight
                        ? "bg-[#c7f022] text-black hover:bg-yellow-300"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  onMouseEnter={(e) => {
                    gsap.fromTo(e.currentTarget, { y: 0 }, { y: -2, duration: 0.18, ease: "power2.out" });
                  }}
                  onMouseLeave={(e) => {
                    gsap.to(e.currentTarget, { y: 0, duration: 0.18, ease: "power2.out" });
                  }}
                >
                  {plan.highlight ? "Upgrade to Prime" : "Start for Free"}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 35%, transparent 70%)",
                      transform: "translateX(-120%) rotate(5deg)",
                    }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

export default PlansPage;
