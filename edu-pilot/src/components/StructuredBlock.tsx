import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { PluggableList } from "unified";
import { COLORS } from "../customSections/HeroSection";

/** Firestore data is not always uniform:
 * - Sections may use { content: string }, { content: string[] }, { items: string[] }, or { text: string }
 * - Section titles may be under `heading` or `title`
 * This file normalizes those shapes before rendering.
 */

/* ---------- Types ---------- */

// Flexible section type that matches Firestore payloads
type AnySection = {
  heading?: string;
  title?: string;
  type?: "text" | "list" | "latex";
  content?: string | string[];
  items?: string[];
  text?: string;
};

export interface Topic {
  title: string;
  date?: string;
  sections: AnySection[];
}

/* ---------- Markdown + KaTeX (sanitized) ---------- */

const katexSanitizeSchema: any = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), ["className"], ["style"]],
    math: [["className"]],
    annotation: [["encoding"]],
  },
};

function MarkdownWithMath({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
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
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/* ---------- Normalization ---------- */

function normalizeSection(s: AnySection | null | undefined) {
  const sec = s || {};
  const heading = sec.heading ?? sec.title ?? "";

  const hasArray =
    Array.isArray(sec.items) || Array.isArray(sec.content);

  const listItems: string[] =
    (Array.isArray(sec.items)
      ? sec.items
      : Array.isArray(sec.content)
      ? (sec.content as string[])
      : []) as string[];

  const textContent =
    typeof sec.content === "string"
      ? sec.content
      : typeof sec.text === "string"
      ? sec.text
      : !hasArray && sec.content != null
      ? String(sec.content)
      : "";

  // infer the type if missing
  const type: "text" | "list" | "latex" =
    sec.type ?? (hasArray ? "list" : "text");

  return { heading, type, textContent, listItems };
}

/* ---------- UI ---------- */

export function StructuredBlock({ topic }: { topic: Topic }) {
  const sections = Array.isArray(topic.sections) ? topic.sections : [];

  return (
    <div
      className="rounded-2xl p-6 sm:p-7 shadow-lg space-y-5"
      style={{
        background: COLORS.GLASS,
        border: `1px solid ${COLORS.BORDER}`,
        backdropFilter: "blur(10px)",
        boxShadow: `inset 0 0 0 1px ${COLORS.PRIMARY}11, 0 10px 40px -20px rgba(0,0,0,0.7)`,
        color: COLORS.TEXT,
      }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4">
        <h2
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: COLORS.TEXT }}
        >
          {topic.title}
        </h2>

        {topic.date ? (
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs"
            style={{
              background: `${COLORS.PRIMARY}22`,
              border: `1px solid ${COLORS.BORDER}`,
              color: COLORS.TEXT,
            }}
          >
            {topic.date}
          </span>
        ) : null}
      </div>

      <div
        aria-hidden
        className="h-[2px] w-full opacity-70"
        style={{
          backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
        }}
      />

      {/* Sections */}
      {sections.map((raw, idx) => {
        const { heading, type, textContent, listItems } = normalizeSection(raw);

        const hasContent =
          (type === "list" && listItems.length > 0) ||
          (type !== "list" && (textContent ?? "").trim().length > 0);

        if (!hasContent) return null;

        const headingEl = heading ? (
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: COLORS.PRIMARY }}
          >
            {heading}
          </h3>
        ) : null;

        const sectionWrapStyle: React.CSSProperties = {
          borderLeft: `2px solid ${COLORS.BORDER}`,
          paddingLeft: 16,
        };

        if (type === "list") {
          return (
            <section key={idx} style={sectionWrapStyle}>
              {headingEl}
              <ul className="list-disc pl-6 space-y-1">
                {listItems.map((item, i) => (
                  <li key={i} className="prose prose-invert max-w-none">
                    <MarkdownWithMath text={String(item)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        }

        if (type === "latex") {
          return (
            <section key={idx} style={sectionWrapStyle}>
              {headingEl}
              <div
                className="overflow-x-auto rounded-lg p-3"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${COLORS.BORDER}`,
                }}
              >
                <BlockMath math={textContent || ""} />
              </div>
            </section>
          );
        }

        // default: text
        return (
          <section key={idx} style={sectionWrapStyle}>
            {headingEl}
            <MarkdownWithMath
              text={textContent || ""}
              className="prose prose-invert max-w-none"
            />
          </section>
        );
      })}
    </div>
  );
}

export function StructuredList({ topics }: { topics: Topic[] }) {
  const list = Array.isArray(topics) ? topics : [];
  return (
    <div className="space-y-8">
      {list.map((topic, i) => (
        <StructuredBlock key={i} topic={topic} />
      ))}
    </div>
  );
}
