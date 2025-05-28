import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function ExplanationSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftImageRef = useRef<HTMLImageElement>(null);
  const rightImageRef = useRef<HTMLImageElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;

    gsap.fromTo(
      leftImageRef.current,
      {
        y: 400,
      },
      {
        y: -100,
        scrollTrigger: {
          trigger: section,
          scrub: 1.9,
          start: "top 80%",
          end: "bottom 20%",
        },
      }
    );

    gsap.fromTo(
      rightImageRef.current,
      {
        clipPath: "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)",
      },
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", 
        ease: "expo.out",
        scrollTrigger: {
          trigger: section,
          start: "top center",
          end: "bottom top",
          scrub: true, 
        },
      }
    );

    gsap.to(textRef.current, {
      scrollTrigger: {
        trigger: textRef.current,
        start: "top bottom",
        scrub: 1.9,
      },
      scale: 2,
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="min-h-screen bg-cover bg-center py-50 bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/explanationSectionBg.jpg')" }}
    >
      <h2 className="text-center text-[#c7f022] text-4xl font-bold mb-20 ">
        From Shakespeare to Science — Edu Pilot Has You Covered
      </h2>

      <div className="flex flex-col lg:flex-row justify-between max-w-[1800px] w-[80%] m-auto gap-12 mt-42 items-center">
        <div ref={leftImageRef}>
          <img className="max-w-md rounded-2xl" src="/Einstein.png" />
        </div>

        <div
          ref={textRef}
          className="px-6 relative text-center z-20"
        >
          <p className="text-white text-3xl uppercase ">
            EduPilot
            <span className="block">=</span>

          </p>
        </div>

        <div ref={rightImageRef}>
          <img className="max-w-md rounded-2xl" src="/CyberEinstein.png" />
        </div>
      </div>
    </section>
  );
}

export default ExplanationSection;

// Edu Pilot combines the brilliance of Einstein with the
// eloquence of Shakespeare — so no matter if you're solving
// complex equations or analyzing classic literature, you're
// always prepared. Our AI adapts to your subject, extracts the
// key points, and gives you summaries, flashcards, and
// practice questions tailored for your needs. It’s like having
// the world’s smartest study partner — in your pocket.
