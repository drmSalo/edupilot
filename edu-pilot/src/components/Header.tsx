import CustomButton from "./CustomButton";

function Header() {
  return (
    <header className="bg-[#c7f022] w-1/2  max-w-lg m-auto rounded-4xl ">
      <nav className="flex justify-between items-center px-8 py-4">
        <h1 className="absolute left-8  text-white font-black text-3xl">Edu Pilot</h1>
        <ul className="flex gap-8 text-[#000] font-bold text-lg">
          <li className="cursor-pointer">Home</li>
          <li className="cursor-pointer">About Us</li>
          <li className="cursor-pointer">Pricing</li>
        </ul>
        <CustomButton containerStyles={'bg-[#000] px-4 py-2 rounded-full'} textStyles={'text-[#c7f022] font-bold'} text="LogIn" />
      </nav>
    </header>
  );
}

export default Header;
