import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { uploadPDFAndExtractText } from "../utils/pdfUtils";
import CustomButton from "../components/CustomButton";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { FaArrowLeft } from "react-icons/fa";

function FolderPage() {
  const { name } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [cards, setCards] = useState<string[] | null>(null);
  const [test, setTest] = useState<string[] | null>(null);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(name || "");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const userPlan = currentUser?.photoURL === "prime" ? "prime" : "basic";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!pdfFile) return;

    setLoading(true);
    try {
      const extractedText = await uploadPDFAndExtractText(pdfFile);

      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });
      const data = await res.json();
      setSummary(data.summary);

      if (userPlan === "prime") {
        const [cardsRes, testRes] = await Promise.all([
          fetch("/api/generate-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: extractedText }),
          }),
          fetch("/api/generate-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: extractedText }),
          }),
        ]);

        const cardsData = await cardsRes.json();
        const testData = await testRes.json();

        setCards(cardsData.cards);
        setTest(testData.questions);
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!currentUser || !name || !newName.trim()) return;

    const oldDocRef = doc(db, "users", currentUser.uid, "projects", name);
    const newDocRef = doc(db, "users", currentUser.uid, "projects", newName.trim());

    try {
      const oldDataSnap = await getDoc(oldDocRef);
      const oldData = oldDataSnap.data();

      if (!oldData) throw new Error("Project not found");

      await setDoc(newDocRef, { ...oldData, name: newName.trim() });
      await deleteDoc(oldDocRef);

      setIsRenameOpen(false);
      navigate(`/folder/${newName.trim()}`);
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !name) return;

    try {
      const projectsSnapshot = await getDocs(collection(db, "users", currentUser.uid, "projects"));
      const matchingDoc = projectsSnapshot.docs.find(doc => doc.data().name === name);

      if (!matchingDoc) {
        console.warn("Project not found by name.");
        return;
      }

      await deleteDoc(doc(db, "users", currentUser.uid, "projects", matchingDoc.id));
      setIsDeleteConfirmOpen(false);
      navigate("/projects", { replace: true });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back to Projects */}
        <div
          className="flex items-center mb-6 space-x-3 cursor-pointer"
          onClick={() => navigate("/projects")}
        >
          <FaArrowLeft className="text-[#c7f022] text-lg hover:text-yellow-400 transition" />
          <span className="text-white text-sm hover:underline">Back to Projects</span>
        </div>

        {/* Title and actions */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-[#c7f022]">
            Project: {name}
          </h1>
          <div className="space-x-2">
            <button
              onClick={() => setIsRenameOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
            >
              Rename
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>

        {/* PDF upload and generation */}
        <div className="mb-10 bg-gray-800 rounded-lg p-6 shadow-md">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Upload a PDF
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="block w-full text-white bg-gray-700 border border-gray-600 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#c7f022]"
          />
          <CustomButton
            text={loading ? "Generating..." : "Generate"}
            containerStyles="bg-[#c7f022] py-2 px-6 rounded-md text-black font-bold hover:bg-yellow-400 transition duration-200 disabled:opacity-50"
            handleClick={handleGenerate}
            disabled={loading || !pdfFile}
          />
        </div>

        {summary && (
          <Section title="Summary">
            <p className="leading-relaxed text-gray-200">{summary}</p>
          </Section>
        )}

        {userPlan === "prime" && cards && (
          <Section title="Flashcards">
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              {cards.map((card, i) => (
                <li key={i}>{card}</li>
              ))}
            </ul>
          </Section>
        )}

        {userPlan === "prime" && test && (
          <Section title="Test Yourself">
            <ul className="list-decimal list-inside space-y-2 text-gray-200">
              {test.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Rename Modal */}
        {isRenameOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-80 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">Rename Project</h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 mb-4 bg-gray-700 text-white rounded focus:outline-none"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsRenameOpen(false)}
                  className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  className="px-4 py-2 text-sm bg-[#c7f022] text-black font-bold rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-80 shadow-lg">
              <h2 className="text-lg font-bold text-red-400 mb-4">Delete this project?</h2>
              <p className="text-gray-300 mb-4">
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 font-bold rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-md">
      <h2 className="text-xl font-semibold text-[#c7f022] mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default FolderPage;
