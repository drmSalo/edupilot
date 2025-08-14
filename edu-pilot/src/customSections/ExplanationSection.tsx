import { COLORS } from "./HeroSection";

export default function ExplanationSection() {
  const steps = [
    { title: "Upload PDF", desc: "Drop textbook, slides, notes.", color: COLORS.PRIMARY },
    { title: "Process", desc: "Parse & summarize smartly.", color: COLORS.ACCENT },
    { title: "Generate", desc: "Flashcards & exam questions.", color: COLORS.ACCENT2 },
  ];
  return (
    <section id="how" className="py-20" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl p-6"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)",
                boxShadow: `0 10px 40px -20px ${s.color}99`,
              }}
            >
              <div className="text-xl font-semibold mb-2" style={{ color: s.color }}>{s.title}</div>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}