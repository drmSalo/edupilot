function PlansPage() {
    const plans = [
      {
        name: "Basic",
        price: "Free",
        features: [
          "PDF to Summary",
          "Project Saving",
          "Rename/Delete Projects",
        ],
        highlight: false,
      },
      {
        name: "Prime",
        price: "9.99€ / month",
        features: [
          "Everything in Basic",
          "Generate Study Cards",
          "Generate Tests/Quizzes",
          "Priority AI Model",
        ],
        highlight: true,
      },
    ];
  
    return (
      <div className="min-h-screen bg-black text-white px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4 text-[#c7f022]">Choose Your Plan</h1>
          <p className="text-gray-300 mb-12">
            Whether you’re just getting started or want full access to EduPilot’s AI tools — we’ve got a plan for you.
          </p>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-xl p-8 shadow-xl transition hover:scale-[1.02] duration-200
                  ${
                    plan.highlight
                      ? "border-[#c7f022] bg-[#101010]"
                      : "border-gray-700 bg-[#1a1a1a]"
                  }`}
              >
                <h2 className="text-2xl font-bold text-white mb-4">{plan.name}</h2>
                <p className="text-[#c7f022] text-3xl font-extrabold mb-6">{plan.price}</p>
  
                <ul className="text-left space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[#c7f022]">✔</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
  
                <button
                  className={`w-full py-3 rounded-md font-semibold transition ${
                    plan.highlight
                      ? "bg-[#c7f022] text-black hover:bg-yellow-300"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {plan.highlight ? "Upgrade to Prime" : "Start for Free"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  export default PlansPage;
  