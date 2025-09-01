import { COLORS } from "./HeroSection";

export default function PricingSection() {
  const tiers = [
    { 
      name: "Prime", 
      price: "€15/mo", 
      features: [
        "Unlimited summaries — process all your PDFs without limits",
        "Unlimited smart flashcards to master every topic",
        "Practice exam questions to prepare with confidence",
        "Priority support — get help when you need it, fast",
        "Save hours every week and study more effectively"
      ], 
      prime: true 
    },
  ];
  return (
    <section id="pricing" className="py-28" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">Pricing</h2>
        
        {/* Center the card */}
        <div className="flex justify-center">
          {tiers.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl p-10 flex flex-col items-center text-center w-full max-w-xl"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)",
                boxShadow: t.prime ? `0 15px 60px -15px ${COLORS.PRIMARY}` : undefined,
              }}
            >
              <div className="text-2xl font-semibold mb-3">{t.name}</div>
              <div 
                className="text-4xl font-extrabold mb-8" 
                style={{ color: t.prime ? COLORS.PRIMARY : COLORS.TEXT }}
              >
                {t.price}
              </div>
              <ul className="space-y-3 mb-8 text-lg" style={{ color: COLORS.SUBTLE }}>
                {t.features.map((f) => (<li key={f}>✓ {f}</li>))}
              </ul>
              <button
                className="mt-auto px-8 py-4 rounded-xl font-bold text-lg"
                style={{
                  background: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                  color: "#00131a",
                  border: "none",
                }}
              >
                Get Prime Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
