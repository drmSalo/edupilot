import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { COLORS } from "../customSections/HeroSection";
import { useAuth } from "../context/AuthContext";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

function TestPage() {
  // ID-basiert (Route: /test/:id)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const fetchQuiz = async () => {
      if (!currentUser || !id) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        const snap = await getDoc(ref);

        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.data() as any;
          setQuiz(Array.isArray(data.quiz) ? data.quiz : []);
          setProjectName(typeof data.name === "string" ? data.name : id);
        } else {
          setQuiz([]);
          setProjectName(id);
        }
      } catch (err) {
        console.error("Failed to fetch quiz:", err);
        if (mounted) {
          setQuiz([]);
          setProjectName(id || "");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setLoading(true);
    fetchQuiz();

    return () => {
      mounted = false;
    };
  }, [currentUser, id]);

  return (
    <div
      className="min-h-screen px-4 py-10 sm:px-6 lg:px-8"
      style={{
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Sticky Top-Bar */}
        <div
          className="sticky top-0 z-10 -mx-2 sm:-mx-4 px-2 sm:px-4 py-4 mb-6 backdrop-blur-md"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0))" }}
        >
          <button
            className="inline-flex items-center gap-2 text-sm hover:opacity-90"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <FaArrowLeft style={{ color: COLORS.PRIMARY }} />
            <span className="underline underline-offset-4 decoration-[rgba(255,255,255,0.25)]">
              Back
            </span>
          </button>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            Test: <span style={{ color: COLORS.PRIMARY }}>{projectName || "—"}</span>
          </h1>

          <div
            aria-hidden
            className="mt-4 h-[2px] w-full opacity-70"
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
          />
        </div>

        {/* Content Card */}
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
          }}
        >
          {loading ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.SUBTLE }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" style={{ color: COLORS.PRIMARY }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                <path d="M4 12a8 8 0 018-8v3.5A4.5 4.5 0 007.5 12H4z" fill="currentColor" opacity="0.9" />
              </svg>
              Loading...
            </div>
          ) : Array.isArray(quiz) && quiz.length > 0 ? (
            <div className="space-y-6">
              {quiz.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl p-6 shadow-lg"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${COLORS.BORDER}`,
                    backdropFilter: "blur(8px)",
                    boxShadow: `inset 0 0 0 1px ${COLORS.PRIMARY}11`,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-bold text-lg">
                      <span style={{ color: COLORS.PRIMARY }}>Q{index + 1}:</span>{" "}
                      <span>{item.question}</span>
                    </p>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {item.options.map((opt, i) => {
                      const isCorrect = opt === item.correct_answer;
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-xl px-4 py-2"
                          style={{
                            background: isCorrect ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isCorrect ? "rgba(34,197,94,0.45)" : COLORS.BORDER}`,
                          }}
                        >
                          {isCorrect ? (
                            <FaCheckCircle className="shrink-0" color="#22c55e" />
                          ) : (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ background: "rgba(255,255,255,0.35)" }}
                            />
                          )}
                          <span>{opt}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div
                    aria-hidden
                    className="mt-4 h-[2px] w-full opacity-70"
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: `${COLORS.ACCENT2}22`,
                border: `1px solid ${COLORS.ACCENT2}55`,
              }}
            >
              No test/quiz available for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestPage;
