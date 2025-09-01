import { COLORS } from "./HeroSection";

export default function StatsStrip() {
  const stats = [
    { k: "150k+", v: "Pages processed" },
    { k: "12k+", v: "Cards generated" },
    { k: "98%",  v: "Satisfaction" },
    { k: "24/7", v: "Available" },
  ];
  return (
    <section className="py-16" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.v}
            className="rounded-xl p-6 text-center"
            style={{
              background: COLORS.GLASS,
              border: `1px solid ${COLORS.BORDER}`,
              backdropFilter: "blur(10px)"
            }}>
            <div className="text-3xl font-black" style={{ color: COLORS.PRIMARY }}>{s.k}</div>
            <div className="text-sm mt-1" style={{ color: COLORS.SUBTLE }}>{s.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
