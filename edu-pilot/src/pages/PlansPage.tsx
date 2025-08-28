import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COLORS } from "../customSections/HeroSection";
import { useDjangoToken } from "../components/hooks/useDjangoToken";
import { useUserPlan } from "../components/hooks/useUserPlan";
import { upgradeToPrime, openBillingPortal } from "../context/payment";

gsap.registerPlugin(ScrollTrigger);

function PlansPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // Cleanup for hover handlers
  const moveHandlersRef = useRef<Map<HTMLDivElement, (e: MouseEvent) => void>>(new Map());

  // Auth / Plan / API token
  const { token: djangoToken, loading: tokenLoading } = useDjangoToken(); // <-- destructure here
  const userPlan = useUserPlan(); // "basic" | "prime"

  // UI state
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const clearNotice = () => setNotice(null);

  // Single plan
  const plans = [
    {
      name: "Prime",
      price: "15 € / month",
      sub: "billed monthly",
      features: [
        "AI-powered summaries — turn PDFs into clear takeaways",
        "Personalized Study Cards — spaced for better retention",
        "Auto-generated Quizzes — test yourself in minutes",
        "Priority access to our fastest AI models",
      ],
      highlight: true,
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.12,
          opacity: 0.85,
          duration: 3,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }

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

      const cardEls = cardsRef.current.filter(Boolean) as HTMLDivElement[];
      if (cardEls.length) {
        tl.fromTo(
          cardEls,
          { y: 60, rotateX: -10, opacity: 0, scale: 0.96, transformOrigin: "center 100%" },
          { y: 0, rotateX: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.12 },
          "-=0.2"
        );
      }

      gsap.to("[data-parallax='title']", {
        yPercent: -10,
        scrollTrigger: { trigger: rootRef.current, start: "top top", scrub: 0.5 },
      });
      gsap.to("[data-parallax='grid']", {
        yPercent: 6,
        scrollTrigger: { trigger: rootRef.current, start: "top top", scrub: 0.5 },
      });

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

  // Handlers
  const handleUpgrade = async () => {
    if (!djangoToken) {
      setNotice("Please sign in to upgrade.");
      return;
    }
    try {
      setLoading(true);
      clearNotice();
      await upgradeToPrime(djangoToken); // <-- pass string token
    } catch (e: any) {
      setNotice(e?.message || "Failed to start checkout.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!djangoToken) {
      setNotice("Please sign in to manage your subscription.");
      return;
    }
    try {
      setLoading(true);
      clearNotice();
      await openBillingPortal(djangoToken); // <-- pass string token
    } catch (e: any) {
      setNotice(e?.message || "Failed to open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-hidden"
      style={{
        isolation: "isolate",
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
      }}
    >
      {/* Aura */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[60rem] w-[60rem] rounded-full blur-3xl opacity-60 -z-20"
        style={{
          background: `radial-gradient(closest-side, ${COLORS.PRIMARY}22, rgba(0,0,0,0))`,
        }}
      />

      {/* Grid */}
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
          className="text-5xl md:text-6xl font-black tracking-tight mb-4 drop-shadow-[0_0_30px_rgba(0,0,0,0.25)]"
          style={{ color: COLORS.PRIMARY }}
        >
          Choose Your Plan
        </h1>
        <p
          ref={subtitleRef}
          className="max-w-2xl mx-auto mb-10"
          style={{ color: COLORS.SUBTLE }}
        >
          Whether you’re just getting started or want full access to EduPilot’s AI tools — we’ve got a plan for you.
        </p>
      </div>

      {/* Notice */}
      {notice && (
        <div className="relative z-20 max-w-xl mx-auto -mt-4 mb-6 px-6">
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: `${COLORS.ACCENT2}22`,
              border: `1px solid ${COLORS.ACCENT2}55`,
              color: COLORS.TEXT,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{notice}</p>
              <button onClick={() => setNotice(null)} className="opacity-80 hover:opacity-100">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single centered card */}
      <div className="relative z-20 mx-auto px-6 pb-24 min-h-[55vh] grid place-items-center">
        {plans.map((plan, idx) => (
          <div
            key={plan.name}
            ref={(el: HTMLDivElement | null) => {
              cardsRef.current[idx] = el;
            }}
            className="group relative rounded-2xl p-8 md:p-10 transition will-change-transform hover:scale-[1.02] hover:-translate-y-1 w-full max-w-xl"
            style={{
              background: COLORS.GLASS,
              border: `1px solid ${COLORS.BORDER}`,
              backdropFilter: "blur(12px)",
              boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), inset 0 0 0 1px ${
                plan.highlight ? COLORS.PRIMARY + "22" : "rgba(255,255,255,0.05)"
              }`,
              backgroundImage:
                "radial-gradient(120px 120px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.06), transparent 40%)",
            }}
          >
            {/* Accent rim */}
            <div
              className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity"
              style={{
                background: plan.highlight ? COLORS.PRIMARY + "22" : "rgba(255,255,255,0.10)",
              }}
            />

            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl md:text-3xl font-extrabold">{plan.name}</h2>
                {plan.highlight && (
                  <span
                    className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold"
                    style={{ background: COLORS.PRIMARY, color: "#00131a" }}
                  >
                    Popular
                  </span>
                )}
              </div>

              <div className="mb-1">
                <p className="text-4xl md:text-5xl font-black" style={{ color: COLORS.PRIMARY }}>
                  {plan.price}
                </p>
                <p className="text-xs mt-1" style={{ color: COLORS.SUBTLE }}>
                  {plan.sub}
                </p>
              </div>

              <ul className="text-left space-y-3 my-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="text-xl" style={{ color: COLORS.PRIMARY }}>
                      ✔
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {userPlan === "prime" ? (
                <button
                  className="w-full py-3.5 rounded-xl font-semibold transition relative overflow-hidden"
                  style={{
                    color: COLORS.TEXT,
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${COLORS.BORDER}`,
                  }}
                  onClick={handleManageBilling}
                  disabled={loading || tokenLoading}
                >
                  {loading ? "Opening portal..." : "Manage Billing"}
                </button>
              ) : (
                <button
                  className="w-full py-3.5 rounded-xl font-semibold transition relative overflow-hidden"
                  style={{
                    color: "#00131a",
                    background: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                    border: "none",
                    boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
                  }}
                  onMouseEnter={(e) =>
                    gsap.fromTo(e.currentTarget, { y: 0 }, { y: -2, duration: 0.18, ease: "power2.out" })
                  }
                  onMouseLeave={(e) => gsap.to(e.currentTarget, { y: 0, duration: 0.18, ease: "power2.out" })}
                  onClick={handleUpgrade}
                  disabled={loading || tokenLoading}
                >
                  {loading || tokenLoading ? "Preparing…" : "Upgrade to Prime"}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 35%, transparent 70%)",
                      transform: "translateX(-120%) rotate(5deg)",
                    }}
                  />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

export default PlansPage;
