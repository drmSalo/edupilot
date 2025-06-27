function FooterSection() {
    return (
      <footer className="bg-[#000] text-gray-400 py-10 pt-20 mt-[0.5px]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row justify-between items-start gap-10">
          
          {/* Logo & Description */}
          <div className="w-full lg:w-1/3">
            <h3 className="text-[#c7f022] text-2xl font-bold mb-2">EduPilot</h3>
            <p className="text-sm leading-relaxed">
              Learn smarter, not harder. EduPilot helps you break down complex lectures, 
              generate study cards, and prepare faster for exams – all powered by intelligent automation.
            </p>
          </div>
  
          {/* Links */}
          <div className="w-full sm:flex-1 flex flex-col gap-2">
            <h4 className="text-white font-semibold mb-2">Quick Links</h4>
            <a href="#" className="hover:text-white transition">Home</a>
            <a href="#" className="hover:text-white transition">Pricing</a>
            <a href="#" className="hover:text-white transition">Upload</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
  
          {/* Legal */}
          <div className="w-full sm:flex-1 flex flex-col gap-2">
            <h4 className="text-white font-semibold mb-2">Legal</h4>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Imprint</a>
          </div>
        </div>
  
        {/* Bottom Bar */}
        <div className="mt-10 text-center text-sm text-gray-500 border-t border-gray-800 pt-4">
          © {new Date().getFullYear()} EduPilot. All rights reserved.
        </div>
      </footer>
    );
  }
  
  export default FooterSection;
  