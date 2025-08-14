import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "katex/dist/katex.min.css";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import Header from "./components/Header";
import AboutUsSection from "./customSections/AboutUsSection";
import ExplanationSection from "./customSections/ExplanationSection";
import FooterSection from "./customSections/FooterSection";
import HeroSection from "./customSections/HeroSection";
import LiteratureSection from "./customSections/LiteratureSection";
import PricingSection from "./customSections/PricingSection";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./ProtectedRoutes";
import ProjectsPage from "./pages/ProjectsPage";
import ProfilePage from "./pages/ProfilePage";
import Layout from "./components/Layout";
import FolderPage from "./pages/FolderPage";
import { useAuth } from "./context/AuthContext";
import PlansPage from "./pages/PlansPage";
import SummaryPage from "./pages/SummaryPage";
import CardsPage from "./pages/CardsPage";
import Reveal from "./components/Reveal";
import TestimonialsSection from "./customSections/TestimonialsSection";
import FAQSection from "./customSections/FAQSection";
import CTASection from "./customSections/CTASection";
import StatsStrip from "./customSections/StatsStrip";
import TestPage from "./pages/TestPage";

gsap.registerPlugin(ScrollToPlugin);

/* -------- GSAP Smooth Wheel (global) -------- */
function useGsapSmoothWheel(opts?: {
  duration?: number;   // Dauer der Animation
  ease?: string;       // GSAP Ease
  multiplier?: number; // Scroll-Strecke pro Rad-Dreh
}) {
  useEffect(() => {
    const isTouch =
      "ontouchstart" in window ||
      (navigator as any).maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    if (isTouch) return; // Mobile/Touch: nativ lassen

    const duration = opts?.duration ?? 0.6;
    const ease = (opts?.ease ?? "power3.out") as any;
    const multiplier = opts?.multiplier ?? 0.9;

    const onWheel = (e: WheelEvent) => {
      // Modifikatoren/Zoom/Horizontal ignorieren
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        // Native Scroll erlauben in Eingaben/scrollbaren Containern
        if (
          target.closest("input, textarea, select, [contenteditable], [data-native-scroll]") ||
          hasScrollableAncestor(target)
        ) {
          return;
        }
      }

      e.preventDefault();

      const current = window.scrollY || window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const delta = e.deltaY * multiplier;
      const next = clamp(current + delta, 0, max);

      gsap.to(window, {
        duration,
        ease,
        scrollTo: { y: next },
      });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [opts]);
}

function hasScrollableAncestor(el: HTMLElement) {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overY = style.overflowY;
    const canScroll =
      (overY === "auto" || overY === "scroll") && node.scrollHeight > node.clientHeight;
    if (canScroll) return true;
    node = node.parentElement;
  }
  return false;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

/* -------- HomePage bleibt wie gehabt -------- */
export function HomePage() {
  const aboutUsRef = useRef<HTMLDivElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-[#060916]">
      <Header
        onHomeClick={() => gsap.to(window, { duration: 1, scrollTo: { y: aboutUsRef.current!, offsetY: 80 }, ease: "power2.out" })}
        onAboutUsClick={() => gsap.to(window, { duration: 1, scrollTo: { y: explanationRef.current!, offsetY: 80 }, ease: "power2.out" })}
        onPricingClick={() => gsap.to(window, { duration: 1, scrollTo: { y: pricingRef.current!, offsetY: 80 }, ease: "power2.out" })}
      />

      <HeroSection />

      <Reveal y={60}><StatsStrip /></Reveal>

      <div ref={aboutUsRef}>
        <Reveal y={60}><AboutUsSection /></Reveal>
      </div>

      <div ref={explanationRef}>
        <Reveal y={60} delay={0.05}><ExplanationSection /></Reveal>
      </div>

      <Reveal y={60} delay={0.08}><LiteratureSection /></Reveal>

      <Reveal y={60} delay={0.1}><TestimonialsSection /></Reveal>

      <div ref={pricingRef}>
        <Reveal y={60} delay={0.1}><PricingSection /></Reveal>
      </div>

      <Reveal y={60}><FAQSection /></Reveal>

      <Reveal y={60}><CTASection /></Reveal>

      <FooterSection />
    </div>
  );
}


/* -------- App mit Smooth Wheel Hook -------- */
function App() {
  const { loading } = useAuth();

  // Smooth, langsames Scrollen aktivieren (Desktop)
  useGsapSmoothWheel({
    duration: 0.65,   // langsamer/smoother
    ease: "power3.out",
    multiplier: 0.9,  // Strecke pro Wheel (größer = schneller)
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:name" element={<FolderPage />} />
              <Route path="/summary/:name" element={<SummaryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/cards/:name" element={<CardsPage />} />
              <Route path="/test/:name" element={<TestPage/>}/>
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
