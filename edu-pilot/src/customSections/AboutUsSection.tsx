import CustomList from "../components/CustomList";

function AboutUsSection() {
  return (
    <section className="py-64 bg-black min-h-screen rounded-t-3xl">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <div className="mb-24">
        <h2 className="text-4xl font-bold text-[#c7f022] mb-12">
          Edu Pilot is your all-in-one AI study assistant.
        </h2>
        <p className="text-white text-2xl">
          Whether you’re preparing for finals or staying ahead during the
          semester, Edu Pilot helps you process dense study material quickly and
          effectively.
        </p>
        </div>
        <CustomList />
      </div>
    </section>
  );
}

export default AboutUsSection;
