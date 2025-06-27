import Container from "../components/Container";

function LiteratureSection() {
  return (
    <section className="min-h-screen bg-black py-50">
      <Container>
        <div>
          <h2 className="text-center text-4xl font-bold text-[#c7f022]">
            Learn with the Speed you've never learned before
          </h2>
        </div>
        <div>
          <ul className="flex flex-col md:flex-row justify-center items-stretch text-white gap-8 my-16">
            <li className="text-white max-w-lg w-full mx-auto bg-[rgba(46,46,46,0.42)] rounded-md p-6">
              <h4 className="uppercase font-bold mb-6 text-[#c7f022]">
                Skip the 300 Pages
              </h4>
              <p className="font-light">
                No need to read every line. EduPilot finds the key concepts,
                definitions, and explanations — so you focus only on what really
                matters.
              </p>
            </li>
            <li className="text-white max-w-lg w-full mx-auto bg-[rgba(46,46,46,0.42)] rounded-md p-6">
              <h4 className="uppercase font-bold mb-6">Study Exam-Focused</h4>
              <p>
                EduPilot highlights the most exam-relevant parts of your
                lecture. No more guessing what to learn — it’s all served to
                you, sorted and simplified.
              </p>
            </li>
            <li className="text-white max-w-lg w-full mx-auto bg-[rgba(46,46,46,0.42)] rounded-md p-6">
              <h4 className="uppercase font-bold mb-6 text-[#c7f022]">
                Learn Smarter, Not Harder
              </h4>
              <p>
                Get AI-generated questions that reinforce your knowledge and
                save time. Learn faster, remember more, and walk into your exam
                with confidence.
              </p>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}

export default LiteratureSection;
