import { useEffect, useRef, useState } from "react";
import Container from "../components/Container";
import CustomButton from "../components/CustomButton";
import CustomModal from "../components/CustomModal";
import { FaFolder, FaSpinner } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useCreateProject } from "../components/hooks/useCreateProject";
import { useDispatch, useSelector } from "react-redux";
import { triggerRefresh } from "../context/projectSlice";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Project {
  id: string;
  name: string;
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { createProject } = useCreateProject();
  const dispatch = useDispatch();
  const refresh = useSelector((state: any) => state.project.refresh);

  // Refs für Animationen
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const q = collection(db, "users", currentUser.uid, "projects");
        const snapshot = await getDocs(q);
        const loaded: Project[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: (doc.data() as any).name || doc.id,
        }));
        setProjects(loaded);
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [currentUser, refresh]);

  // Anim: Header beim Mount
  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: 24, opacity: 0, filter: "blur(2px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.out" }
        );
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // Anim: Grid & Cards bei Änderungen (nach Laden)
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];

      // Grid fade-in
      if (gridRef.current) {
        gsap.fromTo(
          gridRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          }
        );
      }

      if (cards.length) {
        // Startwerte hart setzen, damit nichts „wegblitzt“
        gsap.set(cards, { y: 24, opacity: 0, rotateX: -3, transformOrigin: "center 100%" });
        // Gestaffeltes Reveal
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.06,
          delay: 0.05,
        });
      }
    }, rootRef);
    return () => ctx.revert();
  }, [loading, projects.length]);

  const handleCreateProject = async (name: string): Promise<{ id: string; name: string } | null> => {
    try {
      const id = await createProject(name);
      if (!id) return null;
      dispatch(triggerRefresh());
      return { id, name };
    } catch (err) {
      console.error("Error creating project:", err);
      return null;
    }
  };

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-black text-white flex"
      style={{ isolation: "isolate" }}
    >
      <main className="flex-1 overflow-auto">
        <div className="border-b border-[#c7f022] w-full">
          <h2
            ref={headerRef}
            className="text-left ml-6 uppercase font-bold text-3xl my-10 tracking-wide"
          >
            Projects
          </h2>
        </div>

        <Container>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <FaSpinner className="animate-spin text-3xl text-[#c7f022]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center h-64 flex-col">
              <p className="text-gray-400 text-xl animate-pulse">You haven't created a Project yet...</p>
              <CustomButton
                text="Create Project"
                containerStyles="rounded-full bg-[#c7f022] py-3 mt-5 hover:bg-yellow-300 transition"
                textStyles="text-black px-8 font-bold text-lg"
                handleClick={() => setShowModal(true)}
              />
            </div>
          ) : (
            <div ref={gridRef} className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {projects.map((project, idx) => (
                  <div
                    key={project.id}
                    ref={(el: HTMLDivElement | null) => {
                      cardRefs.current[idx] = el;
                    }}
                    onClick={() => navigate(`/projects/${encodeURIComponent(project.name)}`)}
                    className="group flex flex-col items-center bg-gray-900 p-4 rounded-xl cursor-pointer border border-gray-800 hover:border-[#c7f022]/60 hover:bg-gray-850 transition will-change-transform"
                    style={{ transform: "translateZ(0)" }}
                    onMouseEnter={(e) => {
                      gsap.to(e.currentTarget, { y: -4, duration: 0.18, ease: "power2.out" });
                    }}
                    onMouseLeave={(e) => {
                      gsap.to(e.currentTarget, { y: 0, duration: 0.18, ease: "power2.out" });
                    }}
                  >
                    <div className="relative mb-2">
                      <FaFolder className="text-yellow-400 text-5xl drop-shadow-[0_0_20px_rgba(199,240,34,0.25)]" />
                      {/* kleiner Glow */}
                      <span className="pointer-events-none absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-100 blur-md transition bg-[#c7f022]/15" />
                    </div>
                    <span className="text-sm text-center break-words line-clamp-2">
                      {project.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </main>

      {showModal && (
        <CustomModal setShowModal={setShowModal} onCreate={handleCreateProject} />
      )}
    </div>
  );
}

export default ProjectsPage;
