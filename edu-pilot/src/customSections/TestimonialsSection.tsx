import { COLORS } from "./HeroSection";

export default function TestimonialsSection() {
  const items = [
    { name: "Lisa – Business Informatics", text: "Finally no chaos in the scripts. Cards match the exam 1:1." },
    { name: "Armin – Mechanical Engineering", text: "LaTeX clean, formulas correct. Saves several hours per week." },
    { name: "Mira – Education", text: "Clear summaries, good questions. Learning becomes predictable." },
  ];
  return (
    <section className="py-24" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-10">What students say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((t) => (
            <div key={t.name} className="rounded-2xl p-6"
                 style={{
                   background: COLORS.GLASS,
                   border: `1px solid ${COLORS.BORDER}`,
                   backdropFilter: "blur(10px)",
                 }}>
              <p className="text-sm mb-4" style={{ color: COLORS.SUBTLE }}>"{t.text}"</p>
              <div className="text-sm font-semibold" style={{ color: COLORS.PRIMARY }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
