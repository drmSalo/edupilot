import { useEffect, useRef } from "react";
import { HeroDoc, HeroUpload } from "../CustomSVG";
import { gsap } from "gsap";

function HeroSection() {
  const doc1Ref = useRef(null);
  const doc2Ref = useRef(null);
  const mountainRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    gsap.set([doc1Ref.current, doc2Ref.current, mountainRef.current], {
      y: -220,
      opacity: 0,
    });

    tl.to(doc1Ref.current, {
      y: -380,
      x: -60,
      opacity: 1,
      duration: 1,
      ease: "power2.out",
    }).to(
      doc2Ref.current,
      {
        y: -310,
        x: 60,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
      },
      "<"
    );

    tl.to([doc1Ref.current, doc2Ref.current], {
      x: "+=4",
      duration: 0.1,
      repeat: 3,
      yoyo: true,
      ease: "power1.inOut",
    });
  }, []);

  return (
    <section className="pt-20 min-h-screen pb-18">
      <div className="flex justify-center px-4">
        <div className="bg-[#c7f022] min-h-[700px] w-full max-w-7xl rounded-xl flex flex-col items-center justify-center text-black px-6 py-12 sm:px-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center justify-between w-full">
            {/* Text Block */}
            <div className="w-full lg:w-1/2">
              <h1 className="text-4xl sm:text-5xl font-extrabold my-6">Edu Pilot</h1>
              <p className="text-xl sm:text-2xl max-w-2xl mb-4">
                Upload your <span className="font-black">PDFs</span> and let AI
                create <span className="font-black">flashcards</span> and
                <span className="font-black"> exam questions</span> – all in
                seconds.
              </p>
              <p className="text-base sm:text-lg max-w-xl mb-8">
                Perfect for textbooks, lecture slides, and summaries. Prepare
                faster, learn deeper.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition">
                  Try it Now
                </button>
                <button className="border-2 border-black text-black px-6 py-3 rounded-lg font-medium hover:bg-black hover:text-white transition">
                  Watch Demo
                </button>
              </div>
            </div>

            {/* SVG Upload + Docs */}
            <div className="relative w-full lg:w-1/2 max-w-sm flex flex-col items-center">
              <HeroUpload />
              <div className="absolute top-[80%] flex gap-8 justify-center w-full">
                <div ref={doc1Ref}>
                  <HeroDoc />
                </div>
                <div ref={doc2Ref}>
                  <HeroDoc className="rotate-y-180" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
