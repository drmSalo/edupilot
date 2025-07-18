import { useEffect, useState } from "react";
import Container from "../components/Container";
import CustomButton from "../components/CustomButton";
import CustomModal from "../components/CustomModal";
import { FaFolder } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useCreateProject } from "../components/hooks/useCreateProject";

interface Project {
  id: string;
  name: string;
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { createProject } = useCreateProject();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser) return;

      try {
        const q = collection(db, "users", currentUser.uid, "projects");
        const snapshot = await getDocs(q);
        const loaded: Project[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setProjects(loaded);
      } catch (err) {
        console.error("Fehler beim Laden der Projekte:", err);
      }
    };

    fetchProjects();
  }, [currentUser]);

  const addProjectToList = (project: Project) => {
    setProjects((prev) => [...prev, project]);
  };

  const handleCreateProject = async (name: string): Promise<{ id: string; name: string } | null> => {
    try {
      const id = await createProject(name);
      if (!id) return null;
  
      // Kein addProjectToList mehr → useEffect lädt sauber neu
      return { id, name };
    } catch (err) {
      console.error("Fehler beim Erstellen des Projekts:", err);
      return null;
    }
  };
  

  return (
    <div className="min-h-screen bg-black text-white flex">
      <main className="flex-1 overflow-auto">
        <div className="border-b border-[#c7f022] w-full">
          <h2 className="text-left ml-6 uppercase font-bold text-3xl my-10">
            Projects
          </h2>
        </div>

        <Container>
          {projects.length === 0 ? (
            <div className="flex items-center justify-center h-64 flex-col">
              <p className="text-gray-400 text-xl">
                You haven't created a Project yet...
              </p>
              <CustomButton
                text="Create Project"
                containerStyles="rounded-full bg-[#c7f022] py-3 mt-5"
                textStyles="text-black p-12 font-bold text-lg"
                handleClick={() => setShowModal(true)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() =>
                    navigate(`/projects/${encodeURIComponent(project.name)}`)
                  }
                  className="flex flex-col items-center bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition cursor-pointer border border-gray-700"
                >
                  <FaFolder className="text-yellow-400 text-5xl mb-2" />
                  <span className="text-sm text-center break-words">
                    {project.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>

      {showModal && (
        <CustomModal
          setShowModal={setShowModal}
          onCreate={handleCreateProject}
          addProjectToList={addProjectToList}
        />
      )}
    </div>
  );
}

export default ProjectsPage;
