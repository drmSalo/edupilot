import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { PluggableList } from "unified";

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

/**
 * Sanitize-Schema für KaTeX-Ausgabe.
 * Erlaubt die Klassen/Attribute, die KaTeX braucht, ohne HTML generell zu öffnen.
 */
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

export function StructuredBlock({ topic }: { topic: Topic }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-md text-gray-200 leading-relaxed space-y-4">
      <h2 className="text-2xl font-bold text-white mb-2">{topic.title}</h2>
      <p className="text-sm text-gray-400 mb-4">{topic.date}</p>

      {topic.sections.map((section, idx) => {
        if (!section?.content) return null;

        const headingEl = section.heading ? (
          <h3 className="text-lg font-semibold mb-2">{section.heading}</h3>
        ) : null;

        switch (section.type) {
          case "text": {
            const text = String(section.content);
            return (
              <section key={idx} className="border-l-2 border-[#c7f022]/40 pl-4">
                {headingEl}
                {/* Unterstützt Inline ($...$) und Block ($$...$$) Math im Text */}
                <MarkdownWithMath text={text} className="prose prose-invert max-w-none" />
              </section>
            );
          }

          case "list": {
            const items = section.content as string[];
            return (
              <section key={idx} className="border-l-2 border-[#c7f022]/40 pl-4">
                {headingEl}
                <ul className="list-disc pl-6 space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="prose prose-invert max-w-none">
                      {/* Jeder Listeneintrag kann Inline/Block Math enthalten */}
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
              <section key={idx} className="border-l-2 border-[#c7f022]/40 pl-4 overflow-x-auto">
                {headingEl}
                <BlockMath math={latex} />
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
    <div className="space-y-10">
      {topics.map((topic, i) => (
        <StructuredBlock key={i} topic={topic} />
      ))}
    </div>
  );
}
