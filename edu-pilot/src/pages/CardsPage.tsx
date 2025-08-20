import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft } from "react-icons/fa";
import gsap from "gsap";

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { PluggableList } from "unified";
import { COLORS } from "../customSections/HeroSection";
import { useAuth } from "../context/AuthContext";

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

/* --- FlipCard --- */
function FlipCard({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative h-48 sm:h-56 md:h-64 cursor-pointer select-none"
      style={{ perspective: 1000, overflow: "hidden" }} // wichtig
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="absolute inset-0 rounded-2xl transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl p-4 flex flex-col justify-center overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            background: "rgba(17,24,39,0.85)",
            border: `1px solid ${COLORS.BORDER}`,
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.PRIMARY }}>
            Q{index + 1}
          </div>
          <MarkdownWithMath
            text={question}
            className="prose prose-invert max-w-full text-sm break-words"
          />
          <p className="text-xs text-right text-gray-500 mt-4">Click To Reveal the Answer</p>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl p-4 flex flex-col justify-center overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "rgba(17,24,39,0.9)",
            border: `1px solid ${COLORS.BORDER}`,
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.ACCENT }}>
            Answer
          </div>
          <MarkdownWithMath
            text={answer}
            className="prose prose-invert max-w-full text-sm break-words"
          />
        </div>
      </div>
    </div>
  );
}


/* --- Page --- */
function CardsPage() {
  // ID-basiert
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  const canLoad = useMemo(() => Boolean(currentUser && id), [currentUser, id]);

  useEffect(() => {
    let mounted = true;

    const fetchCards = async () => {
      if (!canLoad) {
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "users", currentUser!.uid, "projects", id!);
        const snap = await getDoc(ref);

        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.data() as any;
          setCards(Array.isArray(data.cards) ? data.cards : []);
          setProjectName(typeof data.name === "string" ? data.name : id!);
        } else {
          setCards([]);
          setProjectName(id!);
        }
      } catch (err) {
        console.error("Failed to fetch cards:", err);
        if (mounted) {
          setCards([]);
          setProjectName(id!);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setLoading(true);
    fetchCards();

    return () => {
      mounted = false;
    };
  }, [canLoad, currentUser, id]);

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
            Study Cards: <span style={{ color: COLORS.PRIMARY }}>{projectName || "—"}</span>
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
