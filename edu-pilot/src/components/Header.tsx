import { useState } from "react";
import CustomButton from "./CustomButton";

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-[#c7f022] w-[90%] max-w-xl m-auto rounded-3xl mt-4 ">
      <nav className="flex justify-between items-center px-6 py-4 gap-3 ">
        {/* Logo */}
        <h1 className="text-black font-black text-3xl left-6 top-4 sm:static sm:top-auto">
          Edu Pilot
        </h1>

        {/* Burger Icon */}
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

        {/* Navigation Links */}
        <ul
          className={`${
            isOpen ? "flex" : "hidden"
          } sm:flex flex-col sm:flex-row gap-6 sm:gap-8 text-black font-bold  rounded-b-2xl text-lg absolute sm:static top-full left-0 w-full sm:w-auto bg-[#c7f022]  sm:bg-transparent px-6 py-4 sm:p-0 z-40`}
        >
          <li className="cursor-pointer">Home</li>
          <li className="cursor-pointer">About Us</li>
          <li className="cursor-pointer">Pricing</li>
        </ul>

        {/* Login Button */}
        <div className="hidden sm:block">
          <CustomButton
            containerStyles="bg-black px-4 py-2 rounded-full"
            textStyles="text-[#c7f022] font-bold"
            text="LogIn"
          />
        </div>
      </nav>

      {/* Mobile Login Button */}
      {isOpen && (
        <div className="sm:hidden flex justify-center pb-4">
          <CustomButton
            containerStyles="bg-black px-4 py-2 rounded-full"
            textStyles="text-[#c7f022] font-bold"
            text="LogIn"
          />
        </div>
      )}
    </header>
  );
}

export default Header;
