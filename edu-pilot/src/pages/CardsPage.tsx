import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import gsap from "gsap";

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { PluggableList } from "unified";
import { COLORS } from "../customSections/HeroSection"; // Design-Palette

interface Card {
  question: string;
  answer: string;
}

/* --- Markdown + Math (KaTeX), sicher gerendert --- */
const katexSanitizeSchema: any = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), ["className"], ["style"]],
    math: [["className"]],
    annotation: [["encoding"]],
  },
};

function MarkdownWithMath({ text, className }: { text: string; className?: string }) {
  const remarkPlugins: PluggableList = [remarkGfm, remarkMath];
  const rehypePlugins: PluggableList = [
    [rehypeSanitize, katexSanitizeSchema],
    [rehypeKatex, { strict: false, throwOnError: false }],
  ];

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins as any}
        rehypePlugins={rehypePlugins as any}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/* --- Helpers --- */
function safeId(name: string) {
  const base = name.trim().toLowerCase();
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return (slug || base.replace(/\W+/g, "-")).slice(0, 120);
}

/* --- FlipCard Component (nur Design geändert) --- */
function FlipCard({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [flipped, setFlipped] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!wrapperRef.current || !innerRef.current) return;
    gsap.set(wrapperRef.current, { perspective: 1200 });
    gsap.set(innerRef.current, { rotateY: 0 });
  }, []);

  useEffect(() => {
    if (!innerRef.current) return;
    gsap.to(innerRef.current, {
      rotateY: flipped ? 180 : 0,
      duration: 0.55,
      ease: "power3.inOut",
    });
  }, [flipped]);

  const toggle = () => setFlipped(v => !v);

  return (
    <div
      ref={wrapperRef}
      className="group relative h-48 sm:h-56 md:h-64 cursor-pointer select-none"
      role="button"
      aria-pressed={flipped}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
      style={{ perspective: 1200 }}
    >
      {/* WICHTIG: KEIN backdropFilter HIER */}
      <div
        ref={innerRef}
        className="absolute inset-0 rounded-2xl transition-transform will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          // Nur eine dünne Outline/Shadow auf dem Flipper selbst:
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 10px 40px -20px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-center"
          style={{
            transform: "rotateY(0deg) translateZ(0)",   // zwingt eigenes 3D-Layer
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            // Glas-Optik AUF DER SEITE, nicht auf dem Flipper:
            background: "rgba(17,24,39,0.85)",          // #111827 @ 85%
            // kein backdropFilter hier, um Safari/Chrome-Bugs zu vermeiden
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold tracking-wider" style={{ color: COLORS.PRIMARY }}>
              Q{index + 1}
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition" style={{ color: COLORS.SUBTLE }}>
              Click to reveal
            </div>
          </div>

          <MarkdownWithMath text={question} className="prose prose-invert max-w-none text-base" />

          <div
            aria-hidden
            className="absolute left-0 right-0 bottom-0 h-[2px] opacity-70"
            style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }}
          />
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-center"
          style={{
            transform: "rotateY(180deg) translateZ(0)",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            background: "rgba(17,24,39,0.90)",          // leicht anders für Kontrast
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold tracking-wider" style={{ color: "#fff" }}>
              Answer
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition" style={{ color: COLORS.SUBTLE }}>
              Click to flip back
            </div>
          </div>

          <MarkdownWithMath text={answer} className="prose max-w-none text-base" />

          <div
            aria-hidden
            className="absolute left-0 right-0 bottom-0 h-[2px] opacity-70"
            style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.ACCENT}, ${COLORS.ACCENT2}, ${COLORS.PRIMARY})` }}
          />
        </div>

        {/* Hover Glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity"
          style={{ background: `${COLORS.PRIMARY}22` }}
        />
      </div>
    </div>
  );
}




/* --- Page (nur Design geändert) --- */
function CardsPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[] | null>(null);

  const projectId = useMemo(() => (name ? safeId(name) : ""), [name]);

  useEffect(() => {
    const fetchCards = async () => {
      const user = getAuth().currentUser;
      const uid = user?.uid;

      if (!uid || !projectId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", uid, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setCards(data.cards || []);
        } else {
          setCards([]);
        }
      } catch (err) {
        console.error("Failed to fetch cards:", err);
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [projectId]);

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
      <div className="max-w-5xl mx-auto">
        {/* Sticky header */}
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
            Study Cards: <span style={{ color: COLORS.PRIMARY }}>{name}</span>
          </h1>

          <div
            aria-hidden
            className="mt-4 h-[2px] w-full opacity-70"
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
          />
        </div>

        {/* Content card */}
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
            <div className="flex items-center justify-center py-10">
              <svg
                className="animate-spin h-10 w-10"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                style={{ color: COLORS.PRIMARY }}
              >
                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3.5a4.5 4.5 0 00-4.5 4.5H4z" />
              </svg>
            </div>
          ) : Array.isArray(cards) && cards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card, i) => (
                <FlipCard key={i} index={i} question={card.question} answer={card.answer} />
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
              No study cards available for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CardsPage;
