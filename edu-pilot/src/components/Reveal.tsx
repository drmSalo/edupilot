// src/components/Reveal.tsx
import { type PropsWithChildren, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Einfach registrieren – ist idempotent, macht keinen Schaden
gsap.registerPlugin(ScrollTrigger);

type RevealProps = {
  y?: number;
  duration?: number;
  delay?: number;
  once?: boolean;
};

export default function Reveal({
  children,
  y = 40,
  duration = 0.8,
  delay = 0,
  once = true,
}: PropsWithChildren<RevealProps>) {
  const el = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !el.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.current,
        { autoAlpha: 0, y, filter: "blur(6px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          ease: "power3.out",
          duration,
          delay,
          scrollTrigger: {
            trigger: el.current!,
            start: "top 80%",
            toggleActions: once ? "play none none none" : "play reverse play reverse",
            // markers: true,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [y, duration, delay, once]);

  return <div ref={el}>{children}</div>;
}
