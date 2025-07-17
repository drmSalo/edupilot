import Container from "../components/Container";
import CustomButton from "../components/CustomButton";
import Sidebar from "../customSections/Sidebar";
import { FaFolder } from "react-icons/fa";

function ProjectsPage() {
  const projects: { name: string }[] = [];

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <main className="flex-1  overflow-auto">
          <div className="border-b border-[#c7f022] w-full">
          <h2 className="text-left ml-6 uppercase font-bold text-3xl my-10">Projects</h2>
          </div>
        <Container>
          {projects.length === 0 ? (
            <div className="flex items-center justify-center h-64 flex-col">
              <p className="text-gray-400 text-xl">You haven't created a Project yet...</p>
              <CustomButton text="Create Project" containerStyles="rounded-full bg-[#c7f022] py-3 mt-5" textStyles="text-black p-12 font-bold text-lg"/>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {projects.map((project, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition cursor-pointer border border-gray-700"
                >
                  <FaFolder className="text-yellow-400 text-5xl mb-2" />
                  <span className="text-sm text-center break-words">{project.name}</span>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}

export default ProjectsPage;
