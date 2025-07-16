import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { useRef } from "react";
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

gsap.registerPlugin(ScrollToPlugin);

export function HomePage() {
  const aboutUsRef = useRef<HTMLDivElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  return (
    <div className="pt-4">
      <Header
        onHomeClick={() =>
          gsap.to(window, {
            duration: 1,
            scrollTo: { y: aboutUsRef.current!, offsetY: 80 },
            ease: "power2.out",
          })
        }
        onAboutUsClick={() =>
          gsap.to(window, {
            duration: 1,
            scrollTo: { y: explanationRef.current!, offsetY: 80 },
            ease: "power2.out",
          })
        }
        onPricingClick={() =>
          gsap.to(window, {
            duration: 1,
            scrollTo: { y: pricingRef.current!, offsetY: 80 },
            ease: "power2.out",
          })
        }
      />
      <HeroSection />
      <div ref={aboutUsRef}>
        <AboutUsSection />
      </div>
      <div ref={explanationRef}>
        <ExplanationSection />
      </div>
      <LiteratureSection />
      <div ref={pricingRef}>
        <PricingSection />
      </div>
      <FooterSection />
    </div>
  );
}






function App() {
  return (
    <Router>
      <div className="bg-gradient-to-br from-[#191834] from-0% via-[#2b2c68] via-30% to-[#61bdaf] to-100%">
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
