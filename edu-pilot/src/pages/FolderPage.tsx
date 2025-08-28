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
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useUserPlan } from "../components/hooks/useUserPlan";
import { useUserAllowances } from "../components/hooks/useUserAllowances";
import { COLORS } from "../customSections/HeroSection";

// ⬇️ new: centralized API actions (wired to ApiProvider/ApiClient)
import { useProjectActions } from "../components/hooks/useProjectAction";

// ----------------------
// Types
// ----------------------
interface QuizItem {
  question: string;
  options: string[];
  correct_answer: string;
}
interface CardItem {
  question: string;
  answer: string;
}
interface Section {
  heading: string;
  type: "text" | "list" | "latex";
  content: string | string[];
}
interface Topic {
  title: string;
  date: string;
  sections: Section[];
}
interface ProjectDoc {
  name: string;
  structured?: Topic[];
  isComplex?: boolean;
  pageCount?: number;
  createdAt?: any;
  cards?: CardItem[];
  quiz?: QuizItem[];
  modelUsed?: string;
  initialized?: boolean;

  // user-level Quota (Snapshot im Projekt)
  plan?: "prime" | "basic";
  monthly_limit?: number;
  uploads_used_this_month?: number;
  uploads_left_this_month?: number;
  month?: string;

  // per-project Regens (vom Backend gesetzt)
  monthlyCardsRegen?: number; // used this month
  monthlyQuizRegen?: number; // used this month
  monthlyRegenMonth?: string; // YYYY-MM
}

type Plan = "prime" | "basic" | null;

// ----------------------
// Component
// ----------------------
export default function FolderPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userPlan = useUserPlan() as Plan;
  const { uploadsLeft } = useUserAllowances(); // optional UI-Hinweis

  // central API actions (no tokens here)
  const { generateSummary, generateCards, generateQuiz } = useProjectActions();

  const [quota, setQuota] = useState<{
    monthly_limit: number;
    uploads_used_this_month: number;
    uploads_left_this_month: number;
    month: string;
  } | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [cards, setCards] = useState<CardItem[] | null>(null);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);

  // Per-Project Limits
  const PROJECT_CARDS_LIMIT = 5;
  const PROJECT_QUIZ_LIMIT = 5;
  const [projectCardsLeft, setProjectCardsLeft] = useState<number | null>(null);
  const [projectQuizLeft, setProjectQuizLeft] = useState<number | null>(null);

  // Modals
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState<string>("");

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Notice
  const [notice, setNotice] = useState<string | null>(null);
  const clearNotice = () => setNotice(null);

  // Abort
  const abortRef = useRef<AbortController | null>(null);
  const cancelOngoing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canGenerate = useMemo(
    () => Boolean(pdfFile && currentUser && id),
    [pdfFile, currentUser, id]
  );

  // ----------------------
  // Projekt laden
  // ----------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!currentUser || !id) return;
      try {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        const snap = await getDoc(ref);
        if (!mounted) return;

        if (!snap.exists()) {
          setProject(null);
          setCards(null);
          setQuiz(null);
          setSummaryGenerated(false);
          setQuota(null);
          setProjectCardsLeft(null);
          setProjectQuizLeft(null);
          setNotice("Projekt nicht gefunden.");
          return;
        }

        const data = snap.data() as ProjectDoc;
        setProject(data);
        setNewName(data.name ?? "");
        setCards(data.cards || null);
        setQuiz(data.quiz || null);
        setSummaryGenerated(Boolean(data.structured && data.structured.length));

        // Quota initial
        if (
          typeof data.monthly_limit === "number" &&
          typeof data.uploads_left_this_month === "number"
        ) {
          setQuota({
            monthly_limit: data.monthly_limit!,
            uploads_used_this_month: data.uploads_used_this_month ?? 0,
            uploads_left_this_month: data.uploads_left_this_month!,
            month: data.month ?? "",
          });
        } else {
          setQuota(null);
        }

        // per-project cards left
        const usedCards = Number(data.monthlyCardsRegen ?? 0);
        if (Number.isFinite(usedCards)) {
          setProjectCardsLeft(Math.max(0, PROJECT_CARDS_LIMIT - usedCards));
        } else {
          setProjectCardsLeft(null);
        }

        // per-project quiz left
        const usedQuiz = Number(data.monthlyQuizRegen ?? 0);
        if (Number.isFinite(usedQuiz)) {
          setProjectQuizLeft(Math.max(0, PROJECT_QUIZ_LIMIT - usedQuiz));
        } else {
          setProjectQuizLeft(null);
        }
      } catch (e) {
        console.error("Error loading project", e);
        if (mounted) setNotice("Fehler beim Laden des Projekts.");
      }
    };

    load();
    return () => {
      mounted = false;
      cancelOngoing();
    };
  }, [currentUser, id]);

  // ----------------------
  // File Handlers
  // ----------------------
  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setNotice("Bitte eine PDF-Datei auswählen.");
      return;
    }
    setPdfFile(f);
  }, []);

  const onDropFile = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setNotice("Bitte eine PDF-Datei ablegen.");
      return;
    }
    setPdfFile(f);
  }, []);

  // ----------------------
  // Summary (ein Button)
  // ----------------------
  const handleGenerateSummary = useCallback(async () => {
    if (!canGenerate) {
      setNotice("PDF, Nutzer oder API-Login fehlen.");
      return;
    }
    if (!project?.name) {
      setNotice("Projektname fehlt.");
      return;
    }
    if (quota && quota.uploads_left_this_month === 0) {
      setNotice("Monatslimit erreicht. Keine weiteren PDF-Uploads möglich.");
      return;
    }

    setLoading(true);
    clearNotice();
    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // zentraler API-Call (keine Header/Token hier)
      const data = await generateSummary(pdfFile!, project.name, {
        signal: controller.signal,
      });
      // erwartete Felder aus der API
      const pageCountFromServer =
        typeof data.page_count === "number" ? data.page_count : undefined;

      setSummaryGenerated(true);
      setProject((prev) => ({
        ...(prev || { name: project.name }),
        modelUsed: data.model_used,
        isComplex: data.is_complex,
        pageCount: pageCountFromServer,
        createdAt: new Date(),
        structured: data.structured,
        plan: data.plan,
        monthly_limit: data.monthly_limit,
        uploads_used_this_month: data.uploads_used_this_month,
        uploads_left_this_month: data.uploads_left_this_month,
        month: data.month,
        monthlyCardsRegen:
          typeof data.project_cards_regen_used_this_month === "number"
            ? data.project_cards_regen_used_this_month
            : prev?.monthlyCardsRegen ?? 0,
        monthlyQuizRegen:
          typeof data.project_quiz_regen_used_this_month === "number"
            ? data.project_quiz_regen_used_this_month
            : prev?.monthlyQuizRegen ?? 0,
        monthlyRegenMonth:
          data.project_cards_regen_month ??
          data.project_quiz_regen_month ??
          prev?.monthlyRegenMonth,
      }));

      // Quota (Uploads) aktualisieren
      if (typeof data.uploads_left_this_month === "number") {
        setQuota({
          monthly_limit: data.monthly_limit ?? quota?.monthly_limit ?? 0,
          uploads_used_this_month:
            data.uploads_used_this_month ?? quota?.uploads_used_this_month ?? 0,
          uploads_left_this_month: data.uploads_left_this_month,
          month: data.month ?? quota?.month ?? "",
        });
      }

      // per-project left aktualisieren
      if (typeof data.project_cards_regen_left_this_month === "number") {
        setProjectCardsLeft(data.project_cards_regen_left_this_month);
      }
      if (typeof data.project_quiz_regen_left_this_month === "number") {
        setProjectQuizLeft(data.project_quiz_regen_left_this_month);
      }

      // Persistieren (nur relevante Felder)
      if (currentUser && id) {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        await setDoc(
          ref,
          {
            modelUsed: data.model_used,
            isComplex: data.is_complex,
            pageCount: pageCountFromServer,
            createdAt: serverTimestamp(),
            structured: data.structured,
            initialized: true,

            // Quota Snapshot
            plan: data.plan,
            monthly_limit: data.monthly_limit,
            uploads_used_this_month: data.uploads_used_this_month,
            uploads_left_this_month: data.uploads_left_this_month,
            month: data.month,

            // Project-Regens
            ...(typeof data.project_cards_regen_used_this_month ===
              "number" && {
              monthlyCardsRegen: data.project_cards_regen_used_this_month,
            }),
            ...(typeof data.project_quiz_regen_used_this_month === "number" && {
              monthlyQuizRegen: data.project_quiz_regen_used_this_month,
            }),
            ...(typeof data.project_cards_regen_month === "string"
              ? { monthlyRegenMonth: data.project_cards_regen_month }
              : typeof data.project_quiz_regen_month === "string"
              ? { monthlyRegenMonth: data.project_quiz_regen_month }
              : {}),
          },
          { merge: true }
        );
      }

      setNotice("Zusammenfassung erstellt.");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("413")) setNotice("Datei zu groß (413). Bitte kürzen.");
      else if (msg.includes("415"))
        setNotice("Dateityp nicht unterstützt (415).");
      else if (msg.includes("401"))
        setNotice("Login/Token abgelaufen (401). Bitte neu anmelden.");
      else if (msg.includes("429"))
        setNotice("Zu viele Anfragen (429). Kurz warten.");
      else setNotice(msg || "Unerwarteter Fehler.");
      console.error("Generation failed", err);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [
    canGenerate,
    currentUser,
    generateSummary,
    id,
    pdfFile,
    project?.name,
    quota,
  ]);

  // ----------------------
  // Cards
  // ----------------------
  const handleGenerateCards = useCallback(async () => {
    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    clearNotice();

    try {
      if (!summaryGenerated || !currentUser || !id) {
        throw new Error(
          "Zusammenfassung fehlt oder Benutzer/Projekt unbekannt."
        );
      }
      if (!project?.name) throw new Error("Projektname fehlt.");
      if (projectCardsLeft === 0) {
        throw new Error(
          `Dieses Projekt hat das monatliche Karten-Regen-Limit (${PROJECT_CARDS_LIMIT}) erreicht.`
        );
      }

      const data = await generateCards(project.name, {
        signal: controller.signal,
      });

      // Persist: nur relevante Felder
      const ref = doc(db, "users", currentUser.uid, "projects", id);
      await setDoc(
        ref,
        {
          cards: data.cards,
          ...(typeof data.project_cards_regen_used_this_month === "number" && {
            monthlyCardsRegen: data.project_cards_regen_used_this_month,
          }),
          ...(typeof data.project_cards_regen_month === "string" && {
            monthlyRegenMonth: data.project_cards_regen_month,
          }),
        },
        { merge: true }
      );

      setCards(data.cards);

      // Quota (uploads) übernehmen
      if (typeof data.uploads_left_this_month === "number") {
        setQuota({
          monthly_limit: data.monthly_limit ?? quota?.monthly_limit ?? 0,
          uploads_used_this_month:
            data.uploads_used_this_month ?? quota?.uploads_used_this_month ?? 0,
          uploads_left_this_month: data.uploads_left_this_month,
          month: data.month ?? quota?.month ?? "",
        });
      }

      // Project-cards-left
      if (typeof data.project_cards_regen_left_this_month === "number") {
        setProjectCardsLeft(data.project_cards_regen_left_this_month);
      } else if (projectCardsLeft !== null) {
        setProjectCardsLeft(Math.max(0, projectCardsLeft - 1));
      }

      setNotice("Karten erstellt.");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("subscription_required") || msg.includes("Prime")) {
        navigate("/plans");
      } else {
        setNotice(msg || "Karten konnten nicht erstellt werden.");
      }
      console.error("Card generation failed", err);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [
    currentUser,
    id,
    navigate,
    project,
    projectCardsLeft,
    summaryGenerated,
    quota,
    generateCards,
  ]);

  // ----------------------
  // Quiz
  // ----------------------
  const handleGenerateQuiz = useCallback(async () => {
    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    clearNotice();

    try {
      if (!summaryGenerated || !currentUser || !id) {
        throw new Error(
          "Zusammenfassung fehlt oder Benutzer/Projekt unbekannt."
        );
      }
      if (!project?.name) throw new Error("Projektname fehlt.");
      if (projectQuizLeft === 0) {
        throw new Error(
          `Dieses Projekt hat das monatliche Quiz-Regen-Limit (${PROJECT_QUIZ_LIMIT}) erreicht.`
        );
      }

      const data = await generateQuiz(project.name, {
        signal: controller.signal,
      });

      // Persist: nur relevante Felder
      const ref = doc(db, "users", currentUser.uid, "projects", id);
      await setDoc(
        ref,
        {
          quiz: data.quiz,
          ...(typeof data.project_quiz_regen_used_this_month === "number" && {
            monthlyQuizRegen: data.project_quiz_regen_used_this_month,
          }),
          ...(typeof data.project_quiz_regen_month === "string" && {
            monthlyRegenMonth: data.project_quiz_regen_month,
          }),
        },
        { merge: true }
      );

      setQuiz(data.quiz);

      // Quota übernehmen
      if (typeof data.uploads_left_this_month === "number") {
        setQuota({
          monthly_limit: data.monthly_limit ?? quota?.monthly_limit ?? 0,
          uploads_used_this_month:
            data.uploads_used_this_month ?? quota?.uploads_used_this_month ?? 0,
          uploads_left_this_month: data.uploads_left_this_month,
          month: data.month ?? quota?.month ?? "",
        });
      }

      // Project-quiz-left
      if (typeof data.project_quiz_regen_left_this_month === "number") {
        setProjectQuizLeft(data.project_quiz_regen_left_this_month);
      } else if (projectQuizLeft !== null) {
        setProjectQuizLeft(Math.max(0, projectQuizLeft - 1));
      }

      setNotice("Quiz erstellt.");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("subscription_required") || msg.includes("Prime")) {
        navigate("/plans");
      } else {
        setNotice(msg || "Quiz konnte nicht erstellt werden.");
      }
      console.error("Quiz generation failed", err);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [
    currentUser,
    id,
    navigate,
    project,
    summaryGenerated,
    projectQuizLeft,
    quota,
    generateQuiz,
  ]);

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
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate("/projects")}
              className="inline-flex items-center gap-2 text-sm hover:opacity-90"
              aria-label="Zurück zu Projekten"
            >
              <FaArrowLeft style={{ color: COLORS.PRIMARY }} />
              <span className="underline underline-offset-4 decoration-[rgba(255,255,255,0.25)]">
                Zurück zu Projekten
              </span>
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
                Umbenennen
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
                Löschen
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Projekt:{" "}
              <span style={{ color: COLORS.PRIMARY }}>
                {project?.name ?? "—"}
              </span>
            </h1>

            <div className="flex items-center gap-4 text-sm">
              <span>
                Verbleibende Uploads: {loading ? "…" : uploadsLeft ?? "—"}
              </span>
              {typeof projectCardsLeft === "number" && (
                <span>Karten-Regens: {loading ? "…" : projectCardsLeft}</span>
              )}
              {typeof projectQuizLeft === "number" && (
                <span>Quiz-Regens: {loading ? "…" : projectQuizLeft}</span>
              )}
            </div>
          </div>

          <div
            aria-hidden
            className="h-[2px] w-full mt-4 opacity-70"
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
          />
        </div>

        {/* Notice */}
        {notice && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{
              background: `${COLORS.ACCENT2}22`,
              border: `1px solid ${COLORS.ACCENT2}55`,
              color: COLORS.TEXT,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{notice}</p>
              <button
                onClick={clearNotice}
                className="opacity-80 hover:opacity-100"
              >
                ✕
              </button>
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
            // Only trigger when the container itself is focused
            if (
              (e.key === "Enter" || e.key === " ") &&
              e.currentTarget === e.target
            ) {
              fileInputRef.current?.click();
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
            <svg
              className="mb-3 h-12 w-12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ color: COLORS.PRIMARY }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9L8 16m4-4l4 4M12 4v8"
              />
            </svg>
            <p className="mb-2 text-sm" style={{ color: COLORS.SUBTLE }}>
              Ziehe deine PDF hierher oder klicke zum Auswählen
            </p>

            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={onPickFile}
              className="hidden"
            />

            {/* Remove the onClick here – htmlFor is enough */}
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-sm font-semibold underline underline-offset-4"
              style={{ color: COLORS.PRIMARY }}
            >
              Datei wählen
            </label>

            {pdfFile && (
              <p className="mt-3 truncate text-sm" style={{ color: "#86efac" }}>
                Ausgewählt: {pdfFile.name}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Generate Summary – EIN Button */}
            <ActionButton
              onClick={handleGenerateSummary}
              disabled={
                loading || !pdfFile || quota?.uploads_left_this_month === 0
              }
              variant="primary"
            >
              {loading ? "Generiere…" : "Zusammenfassung generieren"}
            </ActionButton>

            {/* Cards */}
            <ActionButton
              onClick={handleGenerateCards}
              disabled={
                loading ||
                !summaryGenerated ||
                userPlan !== "prime" ||
                projectCardsLeft === 0
              }
              variant="blue"
            >
              {loading ? "Generiere…" : "Studienkarten generieren"}
            </ActionButton>

            {/* Quiz */}
            <ActionButton
              onClick={handleGenerateQuiz}
              disabled={
                loading ||
                !summaryGenerated ||
                userPlan !== "prime" ||
                projectQuizLeft === 0
              }
              variant="purple"
            >
              {loading ? "Generiere…" : "Quiz generieren"}
            </ActionButton>
          </div>

          {/* Hinweise */}
          {quota?.uploads_left_this_month === 0 && !summaryGenerated && (
            <div className="mt-3 text-xs" style={{ color: "#fca5a5" }}>
              Monatslimit erreicht. Keine weiteren PDF-Uploads möglich.
            </div>
          )}
          {projectCardsLeft === 0 && summaryGenerated && (
            <div className="mt-2 text-xs" style={{ color: "#fca5a5" }}>
              Dieses Projekt hat das monatliche Karten-Regen-Limit (
              {PROJECT_CARDS_LIMIT}) erreicht.
            </div>
          )}
          {projectQuizLeft === 0 && summaryGenerated && (
            <div className="mt-2 text-xs" style={{ color: "#fca5a5" }}>
              Dieses Projekt hat das monatliche Quiz-Regen-Limit (
              {PROJECT_QUIZ_LIMIT}) erreicht.
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10 flex-col">
            <svg
              className="animate-spin h-10 w-10"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              style={{ color: COLORS.PRIMARY }}
            >
              <circle
                className="opacity-30"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v3.5a4.5 4.5 0 00-4.5 4.5H4z"
              />
            </svg>
            <p className="mt-3" style={{ color: COLORS.SUBTLE }}>
              Tab nicht schließen.
            </p>
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
              <h2
                className="mb-2 text-2xl font-bold"
                style={{ color: COLORS.PRIMARY }}
              >
                Zusammenfassung
              </h2>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                Deine generierte Zusammenfassung ist bereit. Klicken zum Öffnen.
              </p>
              <div
                aria-hidden
                className="mt-4 h-[2px] w-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
                }}
              />
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
              <h2
                className="mb-2 text-2xl font-bold"
                style={{ color: "#60a5fa" }}
              >
                Studienkarten
              </h2>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                Karten sind bereit. Klicken zum Öffnen.
              </p>
              <div
                aria-hidden
                className="mt-4 h-[2px] w-full"
                style={{
                  background:
                    "linear-gradient(90deg, #60a5fa, rgba(255,255,255,0))",
                }}
              />
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
              <h2
                className="mb-2 text-2xl font-bold"
                style={{ color: "#a78bfa" }}
              >
                Quiz
              </h2>
              <p className="text-sm" style={{ color: COLORS.SUBTLE }}>
                Quiz ist bereit. Klicken zum Öffnen.
              </p>
              <div
                aria-hidden
                className="mt-4 h-[2px] w-full"
                style={{
                  background:
                    "linear-gradient(90deg, #a78bfa, rgba(255,255,255,0))",
                }}
              />
            </div>
          )}
        </div>

        {/* Rename Modal */}
        {isRenameOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div
              className="w-full max-w-sm rounded-2xl p-6"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="mb-4 text-lg font-bold">Projekt umbenennen</h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mb-4 w-full rounded-lg px-3 py-2 text-black"
                style={{
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
                placeholder="Neuer Projektname"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsRenameOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{
                    border: `1px solid ${COLORS.BORDER}`,
                    background: "rgba(255,255,255,0.02)",
                    color: COLORS.TEXT,
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    if (!currentUser || !id || !newName.trim()) return;
                    try {
                      const ref = doc(
                        db,
                        "users",
                        currentUser.uid,
                        "projects",
                        id
                      );
                      await setDoc(
                        ref,
                        { name: newName.trim() },
                        { merge: true }
                      );
                      setIsRenameOpen(false);
                      setProject((p) =>
                        p ? { ...p, name: newName.trim() } : p
                      );
                      setNotice("Projekt umbenannt.");
                    } catch (e) {
                      console.error("Rename failed", e);
                      setNotice("Umbenennen fehlgeschlagen.");
                    }
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{
                    color: "#00131a",
                    backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                    border: "none",
                  }}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div
              className="w-full max-w-sm rounded-2xl p-6"
              style={{
                background: COLORS.GLASS,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(10px)",
              }}
            >
              <h2
                className="mb-3 text-lg font-bold"
                style={{ color: "#fca5a5" }}
              >
                Projekt löschen?
              </h2>
              <p className="mb-4" style={{ color: COLORS.SUBTLE }}>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{
                    border: `1px solid ${COLORS.BORDER}`,
                    background: "rgba(255,255,255,0.02)",
                    color: COLORS.TEXT,
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    if (!currentUser || !id) return;
                    try {
                      const ref = doc(
                        db,
                        "users",
                        currentUser.uid,
                        "projects",
                        id
                      );
                      await deleteDoc(ref);
                      setIsDeleteConfirmOpen(false);
                      navigate("/projects", { replace: true });
                    } catch (e) {
                      console.error("Delete failed", e);
                      setNotice("Löschen fehlgeschlagen.");
                    }
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(90deg, #ef4444, #b91c1c)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------
// Button
// ----------------------
const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "blue" | "purple";
}> = ({ onClick, disabled, children, variant = "primary" }) => {
  const base =
    "group inline-flex items-center justify-between rounded-xl px-5 py-3 min-h-[56px] text-sm sm:text-base font-bold transition w-full disabled:opacity-60 disabled:cursor-not-allowed";

  const style: React.CSSProperties =
    variant === "primary"
      ? {
          color: "#00131a",
          backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
          boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
          border: "none",
        }
      : variant === "blue"
      ? {
          background: "linear-gradient(90deg, #2563eb, #1e40af)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.08)",
        }
      : {
          background: "linear-gradient(90deg, #7c3aed, #5b21b6)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.08)",
        };

  return (
    <button
      onClick={() => void onClick()}
      disabled={disabled}
      className={base}
      style={style}
    >
      {children}
    </button>
  );
};
