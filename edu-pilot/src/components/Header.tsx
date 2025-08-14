import { COLORS } from "../customSections/HeroSection";

export default function Header({
  onHomeClick,
  onAboutUsClick,
  onPricingClick,
}: {
  onHomeClick: () => void;
  onAboutUsClick: () => void;
  onPricingClick: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{ background: "rgba(3, 6, 16, 0.6)", borderBottom: `1px solid ${COLORS.BORDER}`, color: COLORS.TEXT }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="font-black tracking-tight text-lg">
          <span
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            EDU•PILOT
          </span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <button onClick={onHomeClick} className="opacity-90 hover:opacity-100">Home</button>
          <button onClick={onAboutUsClick} className="opacity-90 hover:opacity-100">About</button>
          <button onClick={onPricingClick} className="opacity-90 hover:opacity-100">Pricing</button>
        </nav>
        <button
          className="hidden sm:inline-flex items-center px-4 py-2 rounded-md text-sm font-medium"
          style={{ border: `1px solid ${COLORS.BORDER}`, color: COLORS.TEXT, background: "rgba(255,255,255,0.02)", backdropFilter: "blur(6px)" }}
        >
          Get started
        </button>
      </div>
    </header>
  );
}