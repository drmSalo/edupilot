import { useState } from "react";
import { COLORS } from "../customSections/HeroSection";

interface CustomModalProps {
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  onCreate: (name: string) => Promise<{ id: string; name: string } | null>;
  addProjectToList?: (project: { id: string; name: string }) => void;
}

function CustomModal({ setShowModal, onCreate, addProjectToList }: CustomModalProps) {
  const [projectName, setProjectName] = useState("");

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    const project = await onCreate(projectName.trim());
    if (project) {
      addProjectToList?.(project);
      setProjectName("");
      setShowModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(20,20,24,0.95), rgba(10,10,12,0.95))",
          border: `1px solid ${COLORS.BORDER}`,
          boxShadow: "0 20px 60px -20px rgba(0,0,0,0.9)",
          color: COLORS.TEXT,
        }}
      >
        <div
          className="h-[2px] w-full rounded mb-4"
          style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }}
        />

        <h3 className="text-xl font-extrabold tracking-tight mb-1">Create New Project</h3>
        <p className="text-xs opacity-60 mb-5">Name it and you’re good to go.</p>

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project name"
          className="w-full rounded-xl bg-white/5 text-white placeholder-white/40 border border-white/10 px-4 py-3
                     outline-none ring-0 focus:border-[#c7f022] focus:ring-2 focus:ring-[#c7f022]/40 transition"
        />

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => setShowModal(false)}
            className="px-4 py-2 rounded-xl border border-white/15 text-white/90 hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>

          {/* === Create-Button im selben Stil wie Sidebar-CTA === */}
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 rounded-xl font-semibold transition hover:opacity-95"
            style={{
              color: "#00131a",
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
              boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
              border: "none",
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;
