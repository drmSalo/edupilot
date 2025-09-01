import { COLORS } from "./HeroSection";

const faqs = [
  { q: "Do you support large PDFs?", a: "Yes. We use chunking & caching so even PDFs with 80+ pages run smoothly." },
  { q: "How good are the flashcards?", a: "Concise, exam-focused, with emphasis on key terms, definitions, and transfer questions." },
  { q: "Do I need Prime?", a: "Yes — Prime unlocks unlimited flashcards and practice exam questions. Summaries are also included." },
  { q: "What about data privacy?", a: "We run on EU servers. Your PDF text is only used for your projects and never sold to third parties." },
];

export default function FAQSection() {
  return (
    <section className="py-24" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-10">FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((f) => (
            <div 
              key={f.q} 
              className="rounded-2xl p-6"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)"
              }}
            >
              <div className="font-semibold mb-2" style={{ color: COLORS.PRIMARY }}>{f.q}</div>
              <div className="text-sm" style={{ color: COLORS.SUBTLE }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
