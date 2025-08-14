import { COLORS } from "../customSections/HeroSection";
import CustomNavLink from "./CustomNavLink";

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
      style={{ borderBottom: `1px solid ${COLORS.BORDER}`, color: COLORS.TEXT }}
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
          <button
            onClick={onHomeClick}
            className="opacity-90 hover:opacity-100"
          >
            Home
          </button>
          <button
            onClick={onAboutUsClick}
            className="opacity-90 hover:opacity-100"
          >
            About
          </button>
          <button
            onClick={onPricingClick}
            className="opacity-90 hover:opacity-100"
          >
            Pricing
          </button>
        </nav>
        <CustomNavLink to={"/login"}
          className="border border-white/10 bg-[rgba(255,255,255,0.02)] backdrop-blur-[6px] rounded-lg px-4 py-2"
          style={{ color: COLORS.TEXT }}
        >
          Get Started
        </CustomNavLink>
      </div>
    </header>
  );
}
