function CustomList() {
  return (
    <div className="flex flex-col md:flex-row gap-10 max-w-7xl mx-auto">
      {/* Card 1 */}
      <div className="flex-1 bg-[#111] rounded-2xl p-6 shadow-sm">
        <img
          src="/AboutPdf.png"
          alt="Turn PDFs into Study Gold"
          className="rounded-xl mb-4 w-full object-cover"
        />
        <h3 className="text-xl font-semibold mb-2 text-[#c7f022]">
          Turn PDFs into Study Gold
        </h3>
        <p className="text-sm text-gray-400">
          We understand the struggles of reading through hundreds of pages of
          material before an exam. That’s why we created a tool that transforms
          long and overwhelming PDFs into clean, concise, and useful study
          material — in just seconds.
        </p>
      </div>

      {/* Card 2 */}
      <div className="flex-1 bg-[#111] rounded-2xl p-6 shadow-sm">
        <img
          src="/path-to-image2.jpg"
          alt="From Notes to Knowledge in Seconds"
          className="rounded-xl mb-4 w-full object-cover"
        />
        <h3 className="text-xl font-semibold mb-2 text-[#c7f022]">
          From Notes to Knowledge in Seconds
        </h3>
        <p className="text-sm text-gray-400">
          Edu Pilot makes studying easier by breaking down lecture notes,
          research papers, and textbooks into clear, digestible parts. It
          highlights key concepts and creates flashcards — so you can skip the
          endless note-taking and start learning faster.
        </p>
      </div>

      {/* Card 3 */}
      <div className="flex-1 bg-[#111] rounded-2xl p-6 shadow-sm">
        <img
          src="/path-to-image3.jpg"
          alt="AI Reframe"
          className="rounded-xl mb-4 w-full object-cover"
        />
        <h3 className="text-xl font-semibold mb-2 text-[#c7f022]">Study Less, Score More with Edu Pilot</h3>
        <p className="text-sm text-gray-400">
          Edu Pilot makes exam prep simple. Just upload your material, and our
          AI will generate practice questions tailored to your content — from
          key concepts to tricky details. It's the fastest way to review, test
          your knowledge, and build confidence before the exam.
        </p>
      </div>
    </div>
  );
}

export default CustomList;
