import { COLORS } from "./HeroSection";

export default function PricingSection() {
  const tiers = [
    { name: "Basic", price: "Free", features: ["PDF → Summary", "Limited cards", "Community support"], prime: false },
    { name: "Prime", price: "€8/mo", features: ["All Basic", "Unlimited cards", "Exam questions", "Priority support"], prime: true },
  ];
  return (
    <section id="pricing" className="py-20" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-12">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)",
                boxShadow: t.prime ? `0 10px 50px -20px ${COLORS.PRIMARY}` : undefined,
              }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-xl font-semibold">{t.name}</div>
                <div className="text-2xl font-black" style={{ color: t.prime ? COLORS.PRIMARY : COLORS.TEXT }}>
                  {t.price}
                </div>
              </div>
              <ul className="space-y-2 mb-6" style={{ color: COLORS.SUBTLE }}>
                {t.features.map((f) => (<li key={f}>• {f}</li>))}
              </ul>
              <button
                className="mt-auto px-5 py-3 rounded-lg font-semibold self-start"
                style={{
                  background: t.prime ? `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})` : "rgba(255,255,255,0.02)",
                  color: t.prime ? "#00131a" : COLORS.TEXT,
                  border: t.prime ? "none" : `1px solid ${COLORS.BORDER}`,
                }}
              >
                Choose {t.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}