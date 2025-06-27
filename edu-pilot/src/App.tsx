import Header from "./components/Header";
import AboutUsSection from "./customSections/AboutUsSection";
import ExplanationSection from "./customSections/ExplanationSection";
import FooterSection from "./customSections/FooterSection";
import HeroSection from "./customSections/HeroSection";
import LiteratureSection from "./customSections/LiteratureSection";
import PricingSection from "./customSections/PricingSection";

function App() {
  return (
    <div className="bg-gradient-to-br from-[#191834] from-0% via-[#2b2c68] via-30% to-[#61bdaf] to-100% pt-5">
      <Header></Header>
      <main>
        <HeroSection />
        <AboutUsSection />
        <ExplanationSection/>
        <LiteratureSection/>
        <PricingSection/>
        <FooterSection/>
      </main>
    </div>
  );
}

export default App;
