import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useUserPlan } from "../components/hooks/useUserPlan";
import { useDjangoToken } from "../components/hooks/useDjangoToken";
import { uploadPDFAndExtractText } from "../utils/pdfUtils";
import { COLORS } from "../customSections/HeroSection";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// ----------------------
// Types
// ----------------------
interface QuizItem { question: string; options: string[]; correct_answer: string; }
interface CardItem { question: string; answer: string; }
interface Section { heading: string; type: "text" | "list" | "latex"; content: string | string[]; }
interface Topic { title: string; date: string; sections: Section[]; }
interface ProjectDoc {
  name: string;
  structured?: Topic[];
  tokenUsage?: number;
  isComplex?: boolean;
  pageCount?: number;
  createdAt?: any;
  cards?: CardItem[];
  quiz?: QuizItem[];
  modelUsed?: string;
  initialized?: boolean;
}

export default function FolderPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();         // <-- die echte Doc-ID
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userPlan = useUserPlan();
  const djangoToken = useDjangoToken();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [cards, setCards] = useState<CardItem[] | null>(null);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);

  // Modals
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState<string>("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Notice
  const [notice, setNotice] = useState<string | null>(null);
  const clearNotice = () => setNotice(null);

  // Abort
  const abortRef = useRef<AbortController | null>(null);
  const cancelOngoing = () => { abortRef.current?.abort(); abortRef.current = null; };

  const canGenerate = useMemo(
    () => Boolean(pdfFile && currentUser && id && djangoToken),
    [pdfFile, currentUser, id, djangoToken]
  );

  // Projekt laden
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUser || !id) return;
      try {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (!snap.exists()) {
          setProject(null); setCards(null); setQuiz(null); setSummaryGenerated(false);
          setNotice("Projekt nicht gefunden.");
          return;
        }
        const data = snap.data() as ProjectDoc;
        setProject(data);
        setNewName(data.name ?? "");
        setCards(data.cards || null);
        setQuiz(data.quiz || null);
        setSummaryGenerated(Boolean(data.structured && data.structured.length));
      } catch (e) {
        console.error("Error loading project", e);
        if (mounted) setNotice("Fehler beim Laden des Projekts.");
      }
    };
    load();
    return () => { mounted = false; cancelOngoing(); };
  }, [currentUser, id]);

  // Handlers
  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.type !== "application/pdf") { setNotice("Bitte eine PDF-Datei auswählen."); return; }
    setPdfFile(f);
  }, []);

  const onDropFile = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (!f) return;
    if (f.type !== "application/pdf") { setNotice("Bitte eine PDF-Datei ablegen."); return; }
    setPdfFile(f);
  }, []);

  const estimatePages = (text: string): number => {
    const byFF = text.split(/\f/g).length;
    const byGaps = text.split(/\n{3,}/g).length;
    const byChars = Math.max(1, Math.round(text.length / 3000));
    return Math.max(1, byFF || byGaps || byChars);
  };

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) { setNotice("Datei, Nutzer oder Token fehlen."); return; }
    if (!project?.name) { setNotice("Projektname fehlt."); return; }

    setLoading(true); clearNotice(); cancelOngoing();
    const controller = new AbortController(); abortRef.current = controller;

    try {
      const extractedText = await uploadPDFAndExtractText(pdfFile!);
      const pageCountGuess = estimatePages(extractedText);

      const res = await fetch(`${API_BASE}/api/generate-project/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${djangoToken}` },
        body: JSON.stringify({ text: extractedText, name: project.name, page_count: pageCountGuess }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI generation failed");

      setSummaryGenerated(true);
      setProject((prev) => ({
        ...(prev || {}),
        modelUsed: data.model_used,
        tokenUsage: data.token_usage,
        isComplex: data.is_complex,
        pageCount: pageCountGuess,
        createdAt: new Date(),
        structured: data.structured,
      }));

      if (currentUser && id) {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        await setDoc(ref, {
          modelUsed: data.model_used,
          tokenUsage: data.token_usage,
          isComplex: data.is_complex,
          pageCount: pageCountGuess,
          createdAt: new Date(),
          structured: data.structured,
          initialized: true,
        }, { merge: true });
      }
      setNotice("Zusammenfassung erstellt.");
    } catch (err: any) {
      console.error("Generation failed", err);
      setNotice(err?.message || "Fehler bei der Generierung.");
    } finally { setLoading(false); abortRef.current = null; }
  }, [canGenerate, currentUser, djangoToken, id, pdfFile, project?.name]);

  const handleGenerateCards = useCallback(async () => {
    if (userPlan !== "prime") { navigate("/plans"); return; }
    if (!summaryGenerated || !currentUser || !id) return;
    if (!project?.name) { setNotice("Projektname fehlt."); return; }

    setLoading(true); clearNotice(); cancelOngoing();
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const res = await fetch(`${API_BASE}/api/generate-study-cards/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${djangoToken}` },
        body: JSON.stringify({ name: project.name }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate cards");

      if (currentUser) {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        await setDoc(ref, { ...(project || {}), cards: data.cards }, { merge: true });
      }
      setCards(data.cards);
      setNotice("Karten erstellt.");
    } catch (err: any) {
      console.error("Card generation failed", err);
      setNotice(err?.message || "Karten konnten nicht erstellt werden.");
    } finally { setLoading(false); abortRef.current = null; }
  }, [currentUser, djangoToken, id, navigate, project, summaryGenerated, userPlan]);

  const handleGenerateQuiz = useCallback(async () => {
    if (userPlan !== "prime") { navigate("/plans"); return; }
    if (!summaryGenerated || !currentUser || !id) return;
    if (!project?.name) { setNotice("Projektname fehlt."); return; }

    setLoading(true); clearNotice(); cancelOngoing();
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const res = await fetch(`${API_BASE}/api/generate-study-quiz/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${djangoToken}` },
        body: JSON.stringify({ name: project.name }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate quiz");

      if (currentUser) {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        await setDoc(ref, { ...(project || {}), quiz: data.quiz }, { merge: true });
      }
      setQuiz(data.quiz);
      setNotice("Quiz erstellt.");
    } catch (err: any) {
      console.error("Quiz generation failed", err);
      setNotice(err?.message || "Quiz konnte nicht erstellt werden.");
    } finally { setLoading(false); abortRef.current = null; }
  }, [currentUser, djangoToken, id, navigate, project, summaryGenerated, userPlan]);

  const handleRename = useCallback(async () => {
    if (!currentUser || !id || !newName.trim()) return;
    try {
      const ref = doc(db, "users", currentUser.uid, "projects", id);
      await setDoc(ref, { name: newName.trim() }, { merge: true });
      setIsRenameOpen(false);
      setProject((p) => (p ? { ...p, name: newName.trim() } : p));
      setNotice("Projekt umbenannt.");
    } catch (e) {
      console.error("Rename failed", e);
      setNotice("Umbenennen fehlgeschlagen.");
    }
  }, [currentUser, id, newName]);

  const handleDelete = useCallback(async () => {
    if (!currentUser || !id) return;
    try {
      const ref = doc(db, "users", currentUser.uid, "projects", id);
      await deleteDoc(ref);
      setIsDeleteConfirmOpen(false);
      navigate("/projects", { replace: true });
    } catch (e) {
      console.error("Delete failed", e);
      setNotice("Löschen fehlgeschlagen.");
    }
  }, [currentUser, id, navigate]);

  // Button
  const ActionButton: React.FC<{
    onClick: () => void; disabled?: boolean; children: React.ReactNode;
    variant?: "primary" | "blue" | "purple";
  }> = ({ onClick, disabled, children, variant = "primary" }) => {
    const base = "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed";
    const style: React.CSSProperties =
      variant === "primary"
        ? { color: "#00131a", backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`, boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`, border: "none" }
        : variant === "blue"
        ? { background: "linear-gradient(90deg, #2563eb, #1e40af)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }
        : { background: "linear-gradient(90deg, #7c3aed, #5b21b6)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" };
    return <button onClick={onClick} disabled={disabled} className={base} style={style}>{children}</button>;
  };

  // ---------------------- Render ----------------------
  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6 lg:px-8"
      style={{
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Header Bar */}
        <div
          className="sticky top-0 z-10 -mx-2 sm:-mx-4 px-2 sm:px-4 py-4 mb-6 backdrop-blur-md"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate("/projects")}
              className="inline-flex items-center gap-2 text-sm hover:opacity-90"
              aria-label="Zurück zu Projekten"
            >
              <FaArrowLeft style={{ color: COLORS.PRIMARY }} />
              <span className="underline underline-offset-4 decoration-[rgba(255,255,255,0.25)]">Back to Projects</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setIsRenameOpen(true)}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{
                  border: `1px solid ${COLORS.BORDER}`,
                  background: "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(6px)",
                  color: COLORS.TEXT,
                }}
              >
                Rename
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{
                  background: "linear-gradient(90deg, #ef4444, #b91c1c)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff",
                }}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Project: <span style={{ color: COLORS.PRIMARY }}>{project?.name ?? "—"}</span>
            </h1>
            {project && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {typeof project.tokenUsage === "number" && (
                  <span className="rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.BORDER}` }}>
                    Tokens: {project.tokenUsage}
                  </span>
                )}
                {project.pageCount && (
                  <span className="rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.BORDER}` }}>
                    Pages: {project.pageCount}
                  </span>
                )}
              </div>
            )}
          </div>

          <div aria-hidden className="h-[2px] w-full mt-4 opacity-70" style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }} />
        </div>

        {/* Notice */}
        {notice && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: `${COLORS.ACCENT2}22`, border: `1px solid ${COLORS.ACCENT2}55`, color: COLORS.TEXT }}>
            <div className="flex items-start justify-between gap-4">
              <p>{notice}</p>
              <button onClick={clearNotice} className="opacity-80 hover:opacity-100">✕</button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          onDrop={onDropFile}
          onDragOver={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              (document.getElementById("file-upload") as HTMLInputElement)?.click();
            }
          }}
          className="group mb-10 rounded-3xl p-8 text-center outline-none transition"
          style={{
            background: COLORS.GLASS,
            border: `2px dashed ${COLORS.PRIMARY}66`,
            backdropFilter: "blur(10px)",
            boxShadow: `0 10px 40px -20px rgba(0,0,0,0.6), inset 0 0 0 1px ${COLORS.BORDER}`,
          }}
          aria-label="PDF Upload Bereich"
        >
          <div className="mx-auto flex max-w-sm flex-col items-center">
            <svg className="mb-3 h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: COLORS.PRIMARY }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9L8 16m4-4l4 4M12 4v8" />
            </svg>
            <p className="mb-2 text-sm" style={{ color: COLORS.SUBTLE }}>
              Drag & drop your PDF here or click to select
            </p>
            <input id="file-upload" type="file" accept="application/pdf" onChange={onPickFile} className="hidden" />
            <label htmlFor="file-upload" className="cursor-pointer text-sm font-semibold underline underline-offset-4" style={{ color: COLORS.PRIMARY }}>
              Browse file
            </label>
            {pdfFile && (
              <p className="mt-3 truncate text-sm" style={{ color: "#86efac" }}>
                Uploaded: {pdfFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-10 grid grid-cols-1 gap-3 sm:auto-cols-max sm:grid-flow-col">
          {!summaryGenerated && (
            <ActionButton onClick={handleGenerate} disabled={loading || !pdfFile}>
              {loading ? "Generating..." : "Generate Summary"}
            </ActionButton>
          )}
          <ActionButton onClick={handleGenerateCards} disabled={loading || !summaryGenerated} variant="blue">
            {loading ? "Generating..." : "Generate Study Cards"}
          </ActionButton>
          <ActionButton onClick={handleGenerateQuiz} disabled={loading || !summaryGenerated} variant="purple">
            {loading ? "Generating..." : "Generate Test"}
          </ActionButton>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10 flex-col">
            <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ color: COLORS.PRIMARY }}>
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3.5a4.5 4.5 0 00-4.5 4.5H4z" />
            </svg>
            <p className="mt-3" style={{ color: COLORS.SUBTLE }}>Please don't close the tab</p>
          </div>
        )}

        {/* Tiles */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {project?.structured && (
            <div
              onClick={() => navigate(`/summary/${id}`)}
              className="cursor-pointer rounded-2xl p-6 transition hover:opacity-95"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                boxShadow: `inset 0 0 0 1px ${COLORS.PRIMARY}11, 0 10px 40px -20px rgba(0,0,0,0.7)`,
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="mb-2 text-2xl font-bold" style={{ color: COLORS.PRIMARY }}>Summary</h2>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                Your generated summary is ready. Click to view it in full.
              </p>
              <div aria-hidden className="mt-4 h-[2px] w-full" style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }} />
            </div>
          )}

          {cards && (
            <div
              onClick={() => navigate(`/cards/${id}`)}
              className="cursor-pointer rounded-2xl p-6 transition hover:opacity-95"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                boxShadow: `inset 0 0 0 1px #2563eb22, 0 10px 40px -20px rgba(0,0,0,0.7)`,
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="mb-2 text-2xl font-bold" style={{ color: "#60a5fa" }}>Study Cards</h2>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                Your study cards are ready. Click to view them.
              </p>
              <div aria-hidden className="mt-4 h-[2px] w-full" style={{ background: "linear-gradient(90deg, #60a5fa, rgba(255,255,255,0))" }} />
            </div>
          )}

          {quiz && (
            <div
              onClick={() => navigate(`/test/${id}`)}
              className="cursor-pointer rounded-2xl p-6 transition hover:opacity-95"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                boxShadow: `inset 0 0 0 1px #a78bfa22, 0 10px 40px -20px rgba(0,0,0,0.7)`,
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="mb-2 text-2xl font-bold" style={{ color: "#a78bfa" }}>Test</h2>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                Your quiz/test is ready. Click to view it.
              </p>
              <div aria-hidden className="mt-4 h-[2px] w-full" style={{ background: "linear-gradient(90deg, #a78bfa, rgba(255,255,255,0))" }} />
            </div>
          )}
        </div>

        {/* Rename Modal */}
        {isRenameOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: COLORS.GLASS, border: `1px solid ${COLORS.BORDER}`, backdropFilter: "blur(10px)" }}>
              <h2 className="mb-4 text-lg font-bold">Rename Project</h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mb-4 w-full rounded-lg px-3 py-2 text-black"
                style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
                placeholder="New project name"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsRenameOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{ border: `1px solid ${COLORS.BORDER}`, background: "rgba(255,255,255,0.02)", color: COLORS.TEXT }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{ color: "#00131a", backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`, border: "none" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: COLORS.GLASS, border: `1px solid ${COLORS.BORDER}`, backdropFilter: "blur(10px)" }}>
              <h2 className="mb-3 text-lg font-bold" style={{ color: "#fca5a5" }}>Delete this project?</h2>
              <p className="mb-4" style={{ color: COLORS.SUBTLE }}>This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{ border: `1px solid ${COLORS.BORDER}`, background: "rgba(255,255,255,0.02)", color: COLORS.TEXT }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(90deg, #ef4444, #b91c1c)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
