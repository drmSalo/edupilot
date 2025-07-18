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
import ProtectedRoute from "./ProtectedRoutes";
import ProjectsPage from "./pages/ProjectsPage";
import ProfilePage from "./pages/ProfilePage";
import Layout from "./components/Layout";
import FolderPage from "./pages/FolderPage"; // NEU
import { useAuth } from "./context/AuthContext";

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
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div className="bg-gradient-to-br from-[#191834] via-[#2b2c68] to-[#61bdaf]">
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
              <Route path="/projects/:name" element={<FolderPage />} /> {/* NEU */}
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
