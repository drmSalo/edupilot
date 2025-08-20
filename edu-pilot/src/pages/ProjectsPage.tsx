import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
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
import { COLORS } from "../customSections/HeroSection";

gsap.registerPlugin(ScrollTrigger);

interface Project {
  id: string;
  name: string;
}

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
  const headerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reduced motion
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Data load
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!currentUser) {
          setProjects([]);
          return;
        }
        const qRef = query(
          collection(db, "users", currentUser.uid, "projects")
        );
        const snap = await getDocs(qRef);
        if (!mounted) return;
        const list: Project[] = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name || d.id,
        }));
        setProjects(list);
      } catch (e: any) {
        console.error("Error loading projects:", e);
        if (mounted) setError("Fehler beim Laden der Projekte.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, refresh]);

  // Header anim
  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion) return;
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: 24, opacity: 0, filter: "blur(2px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.6,
            ease: "power3.out",
          }
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
        gsap.fromTo(
          gridRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: "power2.out" }
        );
      }
      if (cards.length) {
        gsap.set(cards, {
          y: 24,
          opacity: 0,
          rotateX: -3,
          transformOrigin: "center 100%",
        });
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
  }, [loading, projects.length, prefersReducedMotion]);

  const handleCreateProject = useCallback(
    async (name: string): Promise<{ id: string; name: string } | null> => {
      try {
        const id = await createProject(name);
        if (!id) return null;
        dispatch(triggerRefresh());
        return { id, name };
      } catch (err) {
        console.error("Error creating project:", err);
        return null;
      }
    },
    [createProject, dispatch]
  );

  // Keyboard support for cards
  const onCardKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    id: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/projects/${id}`);
    }
  };

  // Skeletons
  const Skeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 animate-pulse"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="h-12 w-12 rounded bg-white/10 mb-3" />
          <div className="h-3 w-4/5 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="min-h-screen flex"
      style={{
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
        isolation: "isolate",
      }}
    >
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div
          ref={headerRef}
          className="sticky top-0 z-10 backdrop-blur-md"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0))",
          }}
        >
          <div className="mx-auto max-w-7xl px-4 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Projects
              </h2>
              <p
                className="text-xs sm:text-sm mt-1"
                style={{ color: COLORS.SUBTLE }}
              >
                Deine PDFs, Karten & Prüfungsfragen auf einen Blick.
              </p>
            </div>
            <CustomButton
              text="Create Project"
              containerStyles="rounded-xl px-5 py-3"
              textStyles="font-semibold"
              handleClick={() => setShowModal(true)}
              btnType="button"
              styleOverride={{
                color: "#00131a",
                backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
                border: "none",
              }}
            />
          </div>
          <div
            aria-hidden
            className="h-[2px] w-full"
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
          />
        </div>

        <Container>
          {/* Error */}
          {error && (
            <div
              className="mx-4 sm:mx-0 my-6 rounded-xl px-4 py-3 text-sm"
              style={{
                background: `${COLORS.ACCENT2}22`,
                border: `1px solid ${COLORS.ACCENT2}55`,
                color: COLORS.TEXT,
              }}
            >
              {error}
            </div>
          )}

          {/* Stats strip (leichtes „Füllmaterial“ im Stil der HomePage) */}
          {!loading && projects.length > 0 && (
            <div className="mx-4 sm:mx-0 my-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { k: projects.length.toString(), v: "Projekte" },
                { k: "24/7", v: "Bereit" },
                { k: "∞", v: "Revisionen" },
                { k: "EU", v: "Datenschutz" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: COLORS.GLASS,
                    border: `1px solid ${COLORS.BORDER}`,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    className="text-2xl font-black"
                    style={{ color: COLORS.PRIMARY }}
                  >
                    {s.k}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: COLORS.SUBTLE }}
                  >
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="pt-2">
              <Skeleton />
              <div className="flex items-center justify-center py-6">
                <FaSpinner
                  className="animate-spin text-2xl"
                  style={{ color: COLORS.PRIMARY }}
                  aria-label="Loading"
                />
              </div>
            </div>
          ) : projects.length === 0 ? (
            // Empty state
            <div className="flex min-h-[52vh] flex-col items-center justify-center text-center px-6">
              <div
                className="mb-6 h-24 w-24 rounded-full"
                style={{
                  background: `radial-gradient(60px 60px at 50% 50%, ${COLORS.PRIMARY}33, transparent 60%)`,
                  boxShadow: `0 0 80px ${COLORS.PRIMARY}22`,
                }}
              />
              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                Noch keine Projekte
              </h3>
              <p className="text-sm mb-6" style={{ color: COLORS.SUBTLE }}>
                Erstelle dein erstes Projekt und lade ein PDF hoch.
              </p>
              <CustomButton
                text="Create Project"
                containerStyles="rounded-xl px-6 py-3"
                textStyles="font-semibold"
                handleClick={() => setShowModal(true)}
                btnType="button"
                styleOverride={{
                  color: "#00131a",
                  backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                  boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
                  border: "none",
                }}
              />
            </div>
          ) : (
            // Grid
            <div ref={gridRef} className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                {projects.map((project, idx) => (
                  <div
                    key={project.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    onKeyDown={(e) => onCardKeyDown(e, project.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open project ${project.name}`}
                    className="group relative flex cursor-pointer flex-col items-center rounded-2xl p-4 outline-none transition"
                    style={{
                      background: COLORS.GLASS,
                      border: `1px solid ${COLORS.BORDER}`,
                      backdropFilter: "blur(10px)",
                      transform: "translateZ(0)",
                      boxShadow: `inset 0 0 0 1px ${COLORS.PRIMARY}11`,
                    }}
                    onMouseEnter={(e) => {
                      if (prefersReducedMotion) return;
                      gsap.to(e.currentTarget, {
                        y: -4,
                        duration: 0.18,
                        ease: "power2.out",
                      });
                    }}
                    onMouseLeave={(e) => {
                      if (prefersReducedMotion) return;
                      gsap.to(e.currentTarget, {
                        y: 0,
                        duration: 0.18,
                        ease: "power2.out",
                      });
                    }}
                  >
                    <div className="relative mb-3">
                      <FaFolder
                        className="text-5xl drop-shadow-[0_0_20px_rgba(0,0,0,0.25)]"
                        style={{ color: COLORS.PRIMARY }}
                      />
                      <span
                        className="pointer-events-none absolute -inset-2 rounded-xl opacity-0 blur-md transition group-hover:opacity-100"
                        style={{ background: `${COLORS.PRIMARY}22` }}
                      />
                    </div>
                    <span
                      className="line-clamp-2 break-words text-center text-sm"
                      style={{ color: COLORS.TEXT }}
                    >
                      {project.name}
                    </span>
                    <div
                      aria-hidden
                      className="absolute left-0 right-0 bottom-0 h-[2px] opacity-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </main>

      {showModal && (
        <CustomModal
          setShowModal={setShowModal}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
