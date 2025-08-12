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

interface Card {
  question: string;
  answer: string;
}

/* --- Markdown + Math (KaTeX), sicher gerendert --- */
const katexSanitizeSchema: any = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className"],
      ["style"],
    ],
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

/* --- FlipCard Component --- */
function FlipCard({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [flipped, setFlipped] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!wrapperRef.current || !innerRef.current) return;
    gsap.set(wrapperRef.current, { perspective: 1200 });
    gsap.set(innerRef.current, { transformStyle: "preserve-3d", rotateY: 0 });
  }, []);

  useEffect(() => {
    if (!innerRef.current) return;
    gsap.to(innerRef.current, {
      rotateY: flipped ? 180 : 0,
      duration: 0.55,
      ease: "power3.inOut",
    });
  }, [flipped]);

  const toggle = () => setFlipped((v) => !v);

  return (
    <div
      ref={wrapperRef}
      className="group relative h-48 sm:h-56 md:h-64"
      role="button"
      aria-pressed={flipped}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
    >
      <div
        ref={innerRef}
        className="absolute inset-0 rounded-2xl shadow-xl bg-gray-800/90 ring-1 ring-white/5 transition-transform"
      >
        {/* Front (Question) */}
        <div
          className="absolute inset-0 backface-hidden rounded-2xl p-5 flex flex-col justify-center
                     bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900"
          style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
        >
          <div className="text-[#c7f022] text-md font-semibold tracking-wider mb-2">
            Q{index + 1}
          </div>
          <MarkdownWithMath text={question} className="prose prose-invert max-w-none text-base" />
          <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-wider text-gray-400 opacity-0 group-hover:opacity-100 transition">
            Click to reveal
          </div>
        </div>

        {/* Back (Answer) */}
        <div
          className="inset-0 rounded-2xl p-5 flex flex-col justify-center text-[#c7f022]"
          style={{
            transform: "rotateY(180deg)",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="text-white text-xs font-semibold tracking-wider mb-2">Answer</div>
          <MarkdownWithMath text={answer} className="prose max-w-none text-base" />
          <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-wider text-white opacity-0 group-hover:opacity-100 transition">
            Click to flip back
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Page --- */
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
        console.warn("Missing UID or projectId, aborting fetch.");
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
          console.warn("No document found for this user/project.");
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
    <div className="min-h-screen bg-gray-900 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div
          className="flex items-center mb-6 space-x-3 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft className="text-[#c7f022] text-lg hover:text-yellow-400 transition" />
        </div>

        <h1 className="text-3xl font-bold text-[#c7f022] mb-6">
          Study Cards: {name}
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <svg
              className="animate-spin h-10 w-10 text-[#c7f022] drop-shadow-[0_0_8px_rgba(199,240,34,0.8)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3.5a4.5 4.5 0 00-4.5 4.5H4z"></path>
            </svg>
          </div>
        ) : Array.isArray(cards) && cards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card, i) => (
              <FlipCard key={i} index={i} question={card.question} answer={card.answer} />
            ))}
          </div>
        ) : (
          <p className="text-red-400">No study cards available for this project.</p>
        )}
      </div>
    </div>
  );
}

export default CardsPage;
