import { COLORS } from "./HeroSection";

export default function FooterSection() {
  return (
    <footer className="py-12 border-t" style={{ borderColor: COLORS.BORDER, color: COLORS.SUBTLE, background: COLORS.BG }}>
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>© {new Date().getFullYear()} Edu Pilot</div>
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:opacity-90">Privacy</a>
          <a href="#" className="hover:opacity-90">Terms</a>
          <a href="#" className="hover:opacity-90">Contact</a>
        </div>
      </div>
    </footer>
  );
}