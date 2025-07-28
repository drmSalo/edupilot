import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

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

export function StructuredBlock({ topic }: { topic: Topic }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-md text-gray-200 leading-relaxed space-y-4 whitespace-pre-wrap">
      <h2 className="text-2xl font-bold text-white mb-2">{topic.title}</h2>
      <p className="text-sm text-gray-400 mb-4">{topic.date}</p>

      {topic.sections.map((section, idx) => {
        if (!section?.content) return null;

        switch (section.type) {
          case "text":
            return (
              <p key={idx} className="text-base">
                {section.content}
              </p>
            );

          case "list":
            return (
              <ul key={idx} className="list-disc list-inside space-y-1 pl-4">
                {(section.content as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );

          case "latex":
            return (
              <div key={idx} className="overflow-x-auto">
                <BlockMath math={section.content as string} />
              </div>
            );

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