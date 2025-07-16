function PricingSection() {
    const img = '/checkIcon.svg';
    const xmark = '/xmark.svg';
  
    return (
      <section className="bg-black py-15 min-h-screen pb-50">
        <div className="max-w-6xl mx-auto px-4 text-white">
          <h2 className="text-4xl font-bold text-center text-white">
            Choose Your Plan
          </h2>
          <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8 mt-20">
            
            {/* Basic Plan */}
            <div className="w-full lg:w-1/2 border border-gray-950 rounded-2xl p-8 bg-[#111] shadow-xl hover:shadow-[#fff]/30 transition">
              <h3 className="text-2xl font-semibold text-white mb-4">Basic – 5 €/mo</h3>
              <ul className="space-y-3 text-lg text-gray-300 mb-6 mt-30">
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> 5 PDF analyses per month
                </li>
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> Smart summaries
                </li>
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> Study cards only
                </li>
                <li className="flex items-start gap-2">
                  <img src={xmark} className="w-5 h-5 mt-1 opacity-40" /> No practice questions
                </li>
                <li className="flex items-start gap-2">
                  <img src={xmark} className="w-5 h-5 mt-1 opacity-40" /> Powered by a lighter, less advanced model
                </li>
              </ul>
              <button className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-[#b4db1f] transition mt-8">
                Get Basic
              </button>
            </div>
  
            {/* Pro Plan */}
            <div className="w-full lg:w-1/2 border border-[#c7f022] border-dashed rounded-2xl p-8 bg-[#1a1a1a] shadow-xl hover:shadow-[#c7f022]/40 transition">
              <h3 className="text-2xl font-semibold text-[#c7f022] mb-4">Pro – 13 €/mo</h3>
              <ul className="space-y-3 text-lg text-gray-300 mb-6 mt-30">
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> 100 PDF analyses per month
                </li>
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> Summaries & study cards
                </li>
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> AI-generated practice questions
                </li>
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> Advanced, high-performance model
                </li>
                <li className="flex items-start gap-2">
                  <img src={img} className="w-5 h-5 mt-1" /> CSV export & exam mode
                </li>
              </ul>
              <button className="w-full bg-[#c7f022] text-black font-semibold py-3 rounded-xl hover:bg-[#b4db1f] transition mt-8">
                Get Pro
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  export default PricingSection;
  