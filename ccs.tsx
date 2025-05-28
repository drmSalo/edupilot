import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface Tab {
  label: string;
  content: string;
  icon: any;
}

const tabs: Tab[] = [
  {
    label: "Simplicity",
    content: "Simplify your study materials with just one upload.",
    icon: (
      <svg
        className="stroke-[#c7f022]"
        width="24px"
        height="24px"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        color="#c7f022"
      >
        <path
          d="M19 13.5V18.6518C19 18.8671 18.8846 19.0659 18.6977 19.1728L12.2977 22.8299C12.1132 22.9353 11.8868 22.9353 11.7023 22.8299L5.30233 19.1728C5.11539 19.0659 5.00001 18.8671 5.00001 18.6518L5 13"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M12 22.5V17"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M23 8L11 1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M13 15L0.999995 8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M1 8C4 3 8 6 11 1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M13 15C16 10 20 13 23 8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </svg>
    ),
  },
  {
    label: "Preparation",
    content: "AI-generated questions to prepare for any exam scenario.",
    icon: (
      <svg
        width="24px"
        height="24px"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        color="#c7f022"
        strokeWidth="1.5"
      >
        <path
          d="M21 21L9 21"
          stroke="#c7f022"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M14.9142 3.41421L19.864 8.36396C20.645 9.14501 20.645 10.4113 19.864 11.1924L10.6213 20.435C10.2596 20.7968 9.76894 21 9.25736 21C8.74577 21 8.25514 20.7968 7.8934 20.435L2.8934 15.435C2.11235 14.654 2.11235 13.3877 2.8934 12.6066L7 8.5L11.75 13.25C12.4404 13.9404 13.5596 13.9404 14.25 13.25C14.9404 12.5596 14.9404 11.4404 14.25 10.75L9.5 6L12.0858 3.41421C12.8668 2.63317 14.1332 2.63317 14.9142 3.41421Z"
          fill="#c7f022"
          stroke="#c7f022"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </svg>
    ),
  },
  {
    label: "Testing",
    content: "Test your understanding with interactive, tailored quizzes.",
    icon: (
      <svg
        width="24px"
        height="24px"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        color="#c7f022"
      >
        <path
          d="M4 4L12 4L20 4V7"
          stroke="#c7f022"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M4 20H12H20V17"
          stroke="#c7f022"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M4 20L12 12L4 4"
          stroke="#c7f022"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </svg>
    ),
  },
];

function CustomList() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const tabRefs = useRef<(HTMLLIElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tabs.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    tabRefs.current.forEach((tab, i) => {
      if (!tab) return;
      gsap.to(tab, {
        backgroundColor: i === activeIndex ? "#333232" : "#111",
        scale: i === activeIndex ? 1.1 : 1,
        duration: 0.5,
      });
    });

    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 }
      );
    }
  }, [activeIndex]);

  return (
    <div className="max-w-4xl m-auto">
      <ul className="flex justify-center gap-3 mb-12">
        {tabs.map((tab, index) => (
          <li
            key={index}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            className="text-white p-3 rounded-2xl pr-14 cursor-pointer"
            onClick={() => setActiveIndex(index)}
          >
            <div className="flex gap-3 items-center">
              {tab.icon} {tab.label}
            </div>
          </li>
        ))}
      </ul>
      <div className="w-full h-[500px] bg-[#c7f022] rounded-3xl flex justify-between p-12">
        <div className="max-w-sm p-8" ref={contentRef}>
          <h3 className="font-black text-3xl mb-4 text-black text-left">
            {tabs[activeIndex].label}
          </h3>
          <p className="text-black text-lg text-left">{tabs[activeIndex].content}</p>
        </div>
      </div>
    </div>
  );
}

export default CustomList;
