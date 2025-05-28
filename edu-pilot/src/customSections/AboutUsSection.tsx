import CustomList from "../components/CustomList";

function AboutUsSection() {
  return (
    <section className="pt-44 pb-52 bg-black min-h-screen rounded-t-3xl">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-[#c7f022] mb-44">
          About Edu Pilot
        </h2>

        <CustomList/>
        
        
        
      </div>
    </section>
  );
}

export default AboutUsSection;
