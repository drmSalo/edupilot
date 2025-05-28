import Container from "../components/Container";
import CustomButton from "../components/CustomButton";

function ExplanationSection() {
  return (
    <section className="bg-[url(/explanationSectionBg.jpg)] min-h-screen bg-cover">
      <div className="bg-black h-screen opacity-95">
        <Container>
          <div className=" pt-14">
            <h2 className="text-center text-[#c7f022] text-4xl font-bold mb-34">
              From Shakespeare to Science — Edu Pilot Has You Covered
            </h2>
            <div className="">
              <div className="rounded-xl bg-[#1a1a1a]">
                <div className="flex gap-5 justify-center p-5">
                  <img
                    className=" rounded-4xl w-md"
                    src="/EinsShakespeare.png"
                  />
                  <div>
                    <p className="text-xl text-white mb-6 font-bold">
                      Edu Pilot combines the brilliance of Einstein with the
                      eloquence of Shakespeare — so no matter if you're solving
                      complex equations or analyzing classic literature, you're
                      always prepared. Our AI adapts to your subject, extracts
                      the key points, and gives you summaries, flashcards, and
                      practice questions tailored for your needs. It’s like
                      having the world’s smartest study partner — in your
                      pocket.
                    </p>
                    <div>
                
                  <CustomButton  containerStyles={'bg-[url(/left.png)] bg-cover p-16 rounded-3xl'} textStyles="text-white" text="Science" />
                </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

export default ExplanationSection;
