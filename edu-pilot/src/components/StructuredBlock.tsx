import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { PluggableList } from "unified";
import { COLORS } from "../customSections/HeroSection";

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

/* Sanitize-Schema für KaTeX */
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

export function StructuredBlock({ topic }: { topic: Topic }) {
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
        <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: COLORS.TEXT }}>
          {topic.title}
        </h2>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs"
          style={{ background: `${COLORS.PRIMARY}22`, border: `1px solid ${COLORS.BORDER}`, color: COLORS.TEXT }}
        >
          {topic.date}
        </span>
      </div>

      <div
        aria-hidden
        className="h-[2px] w-full opacity-70"
        style={{
          backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
        }}
      />

      {/* Sections */}
      {topic.sections.map((section, idx) => {
        if (!section?.content) return null;

        const headingEl = section.heading ? (
          <h3 className="text-lg font-semibold mb-2" style={{ color: COLORS.PRIMARY }}>
            {section.heading}
          </h3>
        ) : null;

        const sectionWrapStyle: React.CSSProperties = {
          borderLeft: `2px solid ${COLORS.BORDER}`,
          paddingLeft: 16,
        };

        switch (section.type) {
          case "text": {
            const text = String(section.content);
            return (
              <section key={idx} style={sectionWrapStyle}>
                {headingEl}
                <MarkdownWithMath text={text} className="prose prose-invert max-w-none" />
              </section>
            );
          }
          case "list": {
            const items = section.content as string[];
            return (
              <section key={idx} style={sectionWrapStyle}>
                {headingEl}
                <ul className="list-disc pl-6 space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="prose prose-invert max-w-none">
                      <MarkdownWithMath text={String(item)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          }
          case "latex": {
            const latex = String(section.content);
            return (
              <section key={idx} style={sectionWrapStyle}>
                {headingEl}
                <div className="overflow-x-auto rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${COLORS.BORDER}` }}>
                  <BlockMath math={latex} />
                </div>
              </section>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

export function StructuredList({ topics }: { topics: Topic[] }) {
  return (
    <div className="space-y-8">
      {topics.map((topic, i) => (
        <StructuredBlock key={i} topic={topic} />
      ))}
    </div>
  );
}
