import { useState } from "react";
import CustomButton from "./CustomButton";
import { Link } from "react-router-dom";

interface HeaderProps {
  onHomeClick: () => void;
  onAboutUsClick: () => void;
  onPricingClick: () => void;
}

function Header({ onHomeClick, onAboutUsClick, onPricingClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-[#c7f022] w-[90%] max-w-xl m-auto rounded-3xl">
      <nav className="flex justify-between items-center px-6 py-4 gap-3 ">
        <h1 className="text-black font-black text-3xl left-6 top-4 sm:static sm:top-auto hover:text-white cursor-pointer">
          Edu Pilot
        </h1>

        <div className="sm:hidden z-50 ml-auto" onClick={() => setIsOpen(!isOpen)}>
          <button className="text-black focus:outline-none">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <ul
          className={`${
            isOpen ? "flex" : "hidden"
          } sm:flex flex-col sm:flex-row gap-6 sm:gap-8 text-black font-bold rounded-b-2xl text-lg absolute sm:static top-full left-0 w-full sm:w-auto bg-[#c7f022] sm:bg-transparent px-6 py-4 sm:p-0 z-40`}
        >
          <li className="cursor-pointer" onClick={() => { onHomeClick(); setIsOpen(false); }}>Home</li>
          <li className="cursor-pointer" onClick={() => { onAboutUsClick(); setIsOpen(false); }}>About Us</li>
          <li className="cursor-pointer" onClick={() => { onPricingClick(); setIsOpen(false); }}>Pricing</li>
        </ul>

        <div className="hidden sm:block">
          <Link to="/login">
            <CustomButton
              containerStyles="bg-black px-4 py-2 rounded-full"
              textStyles="text-[#c7f022] font-bold"
              text="LogIn"
            />
          </Link>
        </div>
      </nav>

      {isOpen && (
        <div className="sm:hidden flex justify-center pb-4">
          <Link to="/login">
            <CustomButton
              containerStyles="bg-black px-4 py-2 rounded-full"
              textStyles="text-[#c7f022] font-bold"
              text="LogIn"
            />
          </Link>
        </div>
      )}
    </header>
  );
}

export default Header;
