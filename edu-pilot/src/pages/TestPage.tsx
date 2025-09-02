import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { COLORS } from "../customSections/HeroSection";
import { useAuth } from "../context/AuthContext";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

type Mode = "taking" | "submitted" | "review";

function TestPage() {
  // Route-ID z.B. /test/:id
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  // Antworten des Users: Index der gewählten Option pro Frage (oder -1 = unbeantwortet)
  const [answers, setAnswers] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>("taking");

  // ===== Daten laden =====
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
          const q: QuizQuestion[] = Array.isArray(data.quiz) ? data.quiz : [];
          setQuiz(q);
          setProjectName(typeof data.name === "string" ? data.name : id);
          setAnswers(q.map(() => -1)); // init unbeantwortet
          setMode("taking");
        } else {
          setQuiz([]);
          setProjectName(id);
          setAnswers([]);
          setMode("taking");
        }
      } catch (err) {
        console.error("Failed to fetch quiz:", err);
        if (mounted) {
          setQuiz([]);
          setProjectName(id || "");
          setAnswers([]);
          setMode("taking");
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

  // ===== Scoring / Metriken =====
  const stats = useMemo(() => {
    if (!quiz || quiz.length === 0) {
      return { total: 0, answered: 0, correct: 0, unanswered: 0, percent: 0 };
    }
    let correct = 0;
    let answered = 0;
    quiz.forEach((q, idx) => {
      const pickIdx = answers[idx];
      if (pickIdx >= 0) {
        answered++;
        if (q.options[pickIdx] === q.correct_answer) correct++;
      }
    });
    const total = quiz.length;
    const unanswered = total - answered;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, answered, correct, unanswered, percent };
  }, [quiz, answers]);

  // ===== Handlers =====
  const handleSelect = (qIndex: number, optIndex: number) => {
    if (mode !== "taking") return; // nach Abgabe keine Änderungen
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!quiz || quiz.length === 0) return;
    setMode("submitted");
  };

  const handleReview = () => {
    setMode("review");
  };

  const handleRetake = () => {
    if (!quiz) return;
    setAnswers(quiz.map(() => -1));
    setMode("taking");
    // Scroll nach oben für klares UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Styles helpers =====
  const headerGradient = {
    backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
  };

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

          <div aria-hidden className="mt-4 h-[2px] w-full opacity-70" style={headerGradient} />
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
          {/* Ladezustand */}
          {loading ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.SUBTLE }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" style={{ color: COLORS.PRIMARY }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                <path d="M4 12a8 8 0 018-8v3.5A4.5 4.5 0 007.5 12H4z" fill="currentColor" opacity="0.9" />
              </svg>
              Loading...
            </div>
          ) : !quiz || quiz.length === 0 ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: `${COLORS.ACCENT2}22`, border: `1px solid ${COLORS.ACCENT2}55` }}
            >
              No test/quiz available for this project.
            </div>
          ) : (
            <>
              {/* Status / Summary */}
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.BORDER}` }}
                >
                  <div style={{ color: COLORS.SUBTLE }}>Total</div>
                  <div className="text-xl font-bold">{stats.total}</div>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.BORDER}` }}
                >
                  <div style={{ color: COLORS.SUBTLE }}>Answered</div>
                  <div className="text-xl font-bold">{stats.answered}</div>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.BORDER}` }}
                >
                  <div style={{ color: COLORS.SUBTLE }}>Unanswered</div>
                  <div className="text-xl font-bold">{stats.unanswered}</div>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.BORDER}` }}
                >
                  <div style={{ color: COLORS.SUBTLE }}>{mode === "taking" ? "—" : "Score"}</div>
                  <div className="text-xl font-bold">
                    {mode === "taking" ? "—" : `${stats.correct}/${stats.total} (${stats.percent}%)`}
                  </div>
                </div>
              </div>

              {/* Fragenliste */}
              <div className="space-y-6">
                {quiz.map((item, qIndex) => {
                  const pickedIdx = answers[qIndex];
                  const correctIdx = item.options.findIndex((o) => o === item.correct_answer);

                  return (
                    <div
                      key={qIndex}
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
                          <span style={{ color: COLORS.PRIMARY }}>Q{qIndex + 1}:</span>{" "}
                          <span>{item.question}</span>
                        </p>

                        {/* Schnellmarker, wenn abgegeben */}
                        {mode !== "taking" && pickedIdx >= 0 && (
                          item.options[pickedIdx] === item.correct_answer ? (
                            <span className="inline-flex items-center gap-2 text-sm" style={{ color: "#22c55e" }}>
                              <FaCheckCircle /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-sm" style={{ color: "#ef4444" }}>
                              <FaTimesCircle /> Incorrect
                            </span>
                          )
                        )}
                      </div>

                      <ul className="mt-4 space-y-2">
                        {item.options.map((opt, optIdx) => {
                          const isPicked = pickedIdx === optIdx;
                          const isCorrect = correctIdx === optIdx;

                          // Darstellung je nach Modus
                          let bg = "rgba(255,255,255,0.03)";
                          let border = COLORS.BORDER;

                          if (mode === "taking") {
                            if (isPicked) {
                              bg = "rgba(255,255,255,0.08)";
                              border = `${COLORS.PRIMARY}88`;
                            }
                          } else if (mode === "submitted") {
                            // Nur Auswahl hervorheben, keine Lösung zeigen
                            if (isPicked) {
                              bg = "rgba(255,255,255,0.08)";
                              border = `${COLORS.PRIMARY}66`;
                            }
                          } else if (mode === "review") {
                            // Review: korrekt grün, falsche Auswahl rot, korrekte Lösung grün markiert
                            if (isPicked && isCorrect) {
                              bg = "rgba(34,197,94,0.12)";
                              border = "rgba(34,197,94,0.45)";
                            } else if (isPicked && !isCorrect) {
                              bg = "rgba(239,68,68,0.12)";
                              border = "rgba(239,68,68,0.45)";
                            } else if (isCorrect) {
                              bg = "rgba(34,197,94,0.08)";
                              border = "rgba(34,197,94,0.35)";
                            }
                          }

                          return (
                            <li
                              key={optIdx}
                              className="flex items-center gap-3 rounded-xl px-4 py-2 cursor-pointer"
                              style={{ background: bg, border: `1px solid ${border}` }}
                              onClick={() => handleSelect(qIndex, optIdx)}
                              role="radio"
                              aria-checked={isPicked}
                            >
                              {/* Bullet / Icons */}
                              {mode === "review" ? (
                                isCorrect ? (
                                  <FaCheckCircle className="shrink-0" />
                                ) : isPicked ? (
                                  <FaTimesCircle className="shrink-0" />
                                ) : (
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                    style={{ background: "rgba(255,255,255,0.35)" }}
                                  />
                                )
                              ) : isPicked ? (
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ background: COLORS.PRIMARY }}
                                />
                              ) : (
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ background: "rgba(255,255,255,0.35)" }}
                                />
                              )}

                              {/* Text */}
                              <span className="select-none">{opt}</span>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Separator */}
                      <div aria-hidden className="mt-4 h-[2px] w-full opacity-70" style={headerGradient} />

                      {/* Hinweis bei Review */}
                      {mode === "review" && (
                        <div className="mt-3 text-xs" style={{ color: COLORS.SUBTLE }}>
                          Correct answer: <span style={{ color: "#22c55e" }}>{item.correct_answer}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {mode === "taking" && (
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2 rounded-xl font-semibold hover:opacity-90"
                    style={{
                      background: COLORS.PRIMARY,
                      color: "#0b0b0b",
                      border: `1px solid ${COLORS.PRIMARY}`,
                    }}
                    disabled={quiz.length === 0}
                  >
                    Submit
                  </button>
                )}

                {mode === "submitted" && (
                  <>
                    <div
                      className="px-4 py-2 rounded-xl text-sm"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${COLORS.BORDER}`,
                      }}
                    >
                      Result: <b>{stats.correct}/{stats.total}</b> ({stats.percent}%)
                    </div>
                    <button
                      onClick={handleReview}
                      className="px-5 py-2 rounded-xl font-semibold hover:opacity-90"
                      style={{
                        background: "transparent",
                        color: COLORS.TEXT,
                        border: `1px solid ${COLORS.PRIMARY}`,
                      }}
                    >
                      Review answers
                    </button>
                    <button
                      onClick={handleRetake}
                      className="px-5 py-2 rounded-xl font-semibold hover:opacity-90"
                      style={{
                        background: "transparent",
                        color: COLORS.TEXT,
                        border: `1px solid ${COLORS.BORDER}`,
                      }}
                    >
                      Retake
                    </button>
                  </>
                )}

                {mode === "review" && (
                  <>
                    <div
                      className="px-4 py-2 rounded-xl text-sm"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${COLORS.BORDER}`,
                      }}
                    >
                      Score: <b>{stats.correct}/{stats.total}</b> ({stats.percent}%)
                    </div>
                    <button
                      onClick={handleRetake}
                      className="px-5 py-2 rounded-xl font-semibold hover:opacity-90"
                      style={{
                        background: "transparent",
                        color: COLORS.TEXT,
                        border: `1px solid ${COLORS.BORDER}`,
                      }}
                    >
                      Retake
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestPage;
