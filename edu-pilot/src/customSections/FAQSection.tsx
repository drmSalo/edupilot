import { COLORS } from "./HeroSection";

const faqs = [
  { q: "Unterstützt ihr große PDFs?", a: "Ja. Wir chunking &caching, damit auch >80 Seiten stabil laufen." },
  { q: "Wie gut sind die Karten?", a: "Konzise, prüfungsnah, mit Fokus auf Begriffe, Definitionen und Transferfragen." },
  { q: "Brauche ich Prime?", a: "Für unbegrenzte Karten & Prüfungsfragen – ja. Summaries gehen auch im Basic." },
  { q: "Datenschutz?", a: "EU-Server, PDF-Text wird nur für deine Projekte genutzt. Kein Verkauf an Dritte." },
];

export default function FAQSection() {
  return (
    <section className="py-24" style={{ background: COLORS.BG, color: COLORS.TEXT }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl sm:text-4xl font-bold mb-10">FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-2xl p-6"
                 style={{
                   background: COLORS.GLASS,
                   border: `1px solid ${COLORS.BORDER}`,
                   backdropFilter: "blur(10px)"
                 }}>
              <div className="font-semibold mb-2" style={{ color: COLORS.PRIMARY }}>{f.q}</div>
              <div className="text-sm" style={{ color: COLORS.SUBTLE }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
