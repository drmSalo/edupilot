import { COLORS } from "./HeroSection";

export default function LiteratureSection() {
  return (
    <section className="py-16" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4 text-center">
        <div className="text-sm mb-6" style={{ color: COLORS.SUBTLE }}>Trusted by students from</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-85">
          {["Leuphana", "TUM", "ETH", "Humboldt"].map((n) => (
            <div
              key={n}
              className="px-4 py-3 rounded-lg"
              style={{ background: COLORS.GLASS, border: `1px solid ${COLORS.BORDER}`, backdropFilter: "blur(10px)" }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}