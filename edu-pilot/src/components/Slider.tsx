import { useState, useEffect, useRef } from "react";

const slides = [
  {
    text: "Empower your learning journey with AI",
    image: "/slider-student.png",
  },
  {
    text: "Turn PDFs into flashcards & summaries",
    image: "/slider-pdf.png",
  },
  {
    text: "Ace exams with Edu Pilot precision",
    image: "/slider-rocket.png",
  },
];

function Slider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    if (touchStartX.current === null || touchEndX.current === null) return;

    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > 50) {
      if (distance > 0) {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative flex flex-col justify-between h-full w-full rounded-tr-2xl rounded-br-2xl overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        backgroundImage: `url(${slides[currentIndex].image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.2s ease-out",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 z-0" />

      {/* Slide Content */}
      <div className="flex-1 flex justify-center items-center z-10 px-6">
        <h2 className="text-3xl font-bold text-white text-center drop-shadow-xl">
          {slides[currentIndex].text}
        </h2>
      </div>

      {/* Slide Indicators */}
      <div className="flex justify-center gap-3 pb-6 z-10">
        {slides.map((_, index) => (
          <div
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-3 w-8 rounded-full transition-all duration-300 cursor-pointer ${
              currentIndex === index ? "bg-white" : "bg-white/40"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}

export default Slider;
