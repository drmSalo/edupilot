import { useState } from "react";

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
      addProjectToList?.(project); // optional chaining = wird nur aufgerufen, wenn vorhanden
      setProjectName("");
      setShowModal(false);
    }
  };
  
  

  return (
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
  );
}

export default CustomModal;

