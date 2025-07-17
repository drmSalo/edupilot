import { useState } from "react";
import CustomNavLink from "../components/CustomNavLink";

function Sidebar() {
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");

  const handleCreate = () => {
    if (!projectName.trim()) return;
    console.log("Creating project:", projectName);
    // hier kannst du speichern oder API call machen
    setProjectName("");
    setShowModal(false);
  };

  return (
    <>
      <aside className="flex flex-col justify-between bg-black text-white w-64 h-screen p-6 shadow-lg top-0 left-0 border-r border-[#c7f022]">
        <div>
          <h2 className="text-3xl font-bold text-[#c7f022] mb-12">Edu Pilot</h2>

          <nav className="flex flex-col gap-4">
            <CustomNavLink to="/projects">Home</CustomNavLink>
            <button
              onClick={() => setShowModal(true)}
              className="text-left text-lg font-medium transition hover:text-[#c7f022] text-white"
            >
              Create Project
            </button>
          </nav>
        </div>
        <div>Upgrade</div>
      </aside>

      {showModal && (
        <div className="fixed inset-0 bg-[#0000008f] flex items-center justify-center z-50">
          <div className="bg-[#c7f022] text-black p-6 rounded-xl w-[90%] max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full p-2 border rounded mb-4 bg-white"
              placeholder="Project name"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white rounded border border-black hover:text-white hover:bg-black"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-black text-white rounded font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
