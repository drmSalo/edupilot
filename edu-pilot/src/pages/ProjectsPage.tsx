import React, { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query } from "firebase/firestore";
import { FaFolder, FaSpinner } from "react-icons/fa";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Container from "../components/Container";
import CustomButton from "../components/CustomButton";
import CustomModal from "../components/CustomModal";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useCreateProject } from "../components/hooks/useCreateProject";
import { useDispatch, useSelector } from "react-redux";
import { triggerRefresh } from "../context/projectSlice";

gsap.registerPlugin(ScrollTrigger);

interface Project { id: string; name: string; }

export default function ProjectsPage(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { createProject } = useCreateProject();
  const dispatch = useDispatch();
  const refresh = useSelector((state: any) => state.project.refresh);

  // Refs for animations
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reduced motion preference
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Data load
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!currentUser) { setProjects([]); return; }
        const qRef = query(collection(db, "users", currentUser.uid, "projects"));
        const snap = await getDocs(qRef);
        if (!mounted) return;
        const list: Project[] = snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name || d.id }));
        setProjects(list);
      } catch (e: any) {
        console.error("Error loading projects:", e);
        if (mounted) setError("Fehler beim Laden der Projekte.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentUser, refresh]);

  // Header anim
  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion) return;
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
  }, [prefersReducedMotion]);

  // Grid & cards anim
  useEffect(() => {
    if (loading || prefersReducedMotion) return;
    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (gridRef.current) {
        gsap.fromTo(gridRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
      }
      if (cards.length) {
        gsap.set(cards, { y: 24, opacity: 0, rotateX: -3, transformOrigin: "center 100%" });
        gsap.to(cards, { y: 0, opacity: 1, rotateX: 0, duration: 0.5, ease: "power3.out", stagger: 0.06, delay: 0.05 });
      }
    }, rootRef);
    return () => ctx.revert();
  }, [loading, projects.length, prefersReducedMotion]);

  const handleCreateProject = useCallback(async (name: string): Promise<{ id: string; name: string } | null> => {
    try {
      const id = await createProject(name);
      if (!id) return null;
      dispatch(triggerRefresh());
      return { id, name };
    } catch (err) {
      console.error("Error creating project:", err);
      return null;
    }
  }, [createProject, dispatch]);

  // Keyboard support for cards
  const onCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, name: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/projects/${encodeURIComponent(name)}`);
    }
  };

  // Skeletons
  const Skeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-4 animate-pulse">
          <div className="h-12 w-12 rounded bg-gray-800 mb-3" />
          <div className="h-3 w-4/5 rounded bg-gray-800" />
        </div>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className="min-h-screen bg-black text-white flex" style={{ isolation: "isolate" }}>
      <main className="flex-1 overflow-auto">
        <div className="w-full border-b border-[#c7f022]">
          <h2 ref={headerRef} className="ml-6 my-8 text-left text-2xl sm:text-3xl font-extrabold uppercase tracking-wide">
            Projects
          </h2>
        </div>

        <Container>
          {/* Error */}
          {error && (
            <div className="mx-6 my-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="pt-2">
              <Skeleton />
              <div className="flex items-center justify-center py-6">
                <FaSpinner className="animate-spin text-2xl text-[#c7f022]" aria-label="Loading" />
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
              <p className="text-xl text-gray-400">You haven't created a Project yet...</p>
              <CustomButton
                text="Create Project"
                containerStyles="mt-5 rounded-full bg-[#c7f022] py-3 px-8 font-bold text-black hover:bg-yellow-300 transition"
                textStyles="text-lg"
                handleClick={() => setShowModal(true)}
              />
            </div>
          ) : (
            <div ref={gridRef} className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                {projects.map((project, idx) => (
                  <div
                    key={project.id}
                    ref={(el) => { cardRefs.current[idx] = el; }}
                    onClick={() => navigate(`/projects/${encodeURIComponent(project.name)}`)}
                    onKeyDown={(e) => onCardKeyDown(e, project.name)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open project ${project.name}`}
                    className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-gray-800 bg-gray-900 p-4 outline-none transition hover:border-[#c7f022]/60 focus:border-[#c7f022] focus:ring-2 focus:ring-[#c7f022]/70"
                    style={{ transform: "translateZ(0)" }}
                    onMouseEnter={(e) => { if (prefersReducedMotion) return; gsap.to(e.currentTarget, { y: -4, duration: 0.18, ease: "power2.out" }); }}
                    onMouseLeave={(e) => { if (prefersReducedMotion) return; gsap.to(e.currentTarget, { y: 0, duration: 0.18, ease: "power2.out" }); }}
                  >
                    <div className="relative mb-2">
                      <FaFolder className="text-5xl text-yellow-400 drop-shadow-[0_0_20px_rgba(199,240,34,0.25)]" />
                      <span className="pointer-events-none absolute -inset-2 rounded-xl bg-[#c7f022]/15 opacity-0 blur-md transition group-hover:opacity-100" />
                    </div>
                    <span className="line-clamp-2 break-words text-center text-sm">{project.name}</span>
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
