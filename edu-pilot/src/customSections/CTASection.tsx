import { COLORS } from "./HeroSection";

export default function CTASection() {
  return (
    <section className="py-24" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div 
        className="mx-auto max-w-5xl p-12 text-center rounded-3xl overflow-hidden"
        style={{
          background: COLORS.GLASS,
          border: `1px solid ${COLORS.BORDER}`,
          backdropFilter: "blur(12px)",
          boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`
        }}
      >
        <h3 className="text-2xl sm:text-3xl font-black">Ready to study with focus?</h3>
        <p className="mt-3 text-sm" style={{ color: COLORS.SUBTLE }}>
          Upload a PDF and get a structured summary plus flashcards in minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a 
            href="/projects"
            className="px-6 py-3 rounded-lg font-semibold"
            style={{
              color: "#00131a",
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
              boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
            }}
          >
            Start now
          </a>
          <a 
            href="#how"
            className="px-6 py-3 rounded-lg font-semibold"
            style={{
              color: COLORS.TEXT,
              border: `1px solid ${COLORS.BORDER}`,
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(6px)",
            }}
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  );
}
