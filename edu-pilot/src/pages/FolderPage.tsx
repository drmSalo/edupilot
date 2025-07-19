import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { uploadPDFAndExtractText } from "../utils/pdfUtils";
import CustomButton from "../components/CustomButton";
import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { FaArrowLeft } from "react-icons/fa";
import { useUserPlan } from "../components/hooks/useUserPlan";
import { useDjangoToken } from "../components/hooks/useDjangoToken";

function FolderPage() {
  const { name } = useParams<{ name: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [cards, setCards] = useState<string[] | null>(null);
  const [test, setTest] = useState<string[] | null>(null);
  const [projectData, setProjectData] = useState<any | null>(null);
  const [summaryPdfUrl, setSummaryPdfUrl] = useState<string | null>(null);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(name || "");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const userPlan = useUserPlan();
  const djangoToken = useDjangoToken();

  useEffect(() => {
    const fetchProject = async () => {
      if (!currentUser || !name) return;
      try {
        const projectRef = doc(db, "users", currentUser.uid, "projects", name);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const data = projectSnap.data();
          setProjectData(data);
          setSummary(data.summary);
          setCards(data.cards);
          setTest(data.quiz);
          if (data.summaryPdfUrl) {
            setSummaryPdfUrl(data.summaryPdfUrl);
          }
        } else {
          setProjectData(null);
        }
      } catch (err) {
        console.error("Error loading project:", err);
      }
    };
    fetchProject();
  }, [currentUser, name]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!pdfFile || !currentUser || !name || !djangoToken) {
      alert("Missing file, user or token.");
      return;
    }
  
    setLoading(true);
    try {
      const extractedText = await uploadPDFAndExtractText(pdfFile);
      const pageCount = extractedText.split(/\f|\n{3,}/).length;
  
      const res = await fetch("http://localhost:8000/api/generate-project/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${djangoToken}`,
        },
        body: JSON.stringify({
          text: extractedText,
          name,
          plan: userPlan,
          page_count: pageCount,
        }),
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI generation failed");
  
      // ✅ NICHT NOCHMAL SPEICHERN – Backend hat's schon gemacht
  
      setSummary(data.summary);
      setCards(data.cards);
      setTest(data.quiz);
      setSummaryPdfUrl(data.summary_pdf_url);
      setProjectData({
        name,
        summary: data.summary,
        cards: data.cards,
        quiz: data.quiz,
        modelUsed: data.model_used,
        tokenUsage: data.token_usage,
        isComplex: data.is_complex,
        pageCount,
        createdAt: new Date(),
        summaryPdfUrl: data.summary_pdf_url,
        structured: data.structured,
      });
  
    } catch (err) {
      console.error("Generation failed:", err);
      alert("Something went wrong while generating. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleGenerateCards = async () => {
    if (!projectData?.summary || !djangoToken || !currentUser || !name) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/generate-study-cards/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${djangoToken}`,
        },
        body: JSON.stringify({ text: projectData.summary, name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const ref = doc(db, "users", currentUser.uid, "projects", name!);
      await setDoc(ref, { ...projectData, cards: data.cards }, { merge: true });
      setCards(data.cards);
    } catch (err) {
      console.error("Card generation failed:", err);
      alert("Failed to generate cards.");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!currentUser || !name || !newName.trim()) return;
    try {
      const oldDocRef = doc(db, "users", currentUser.uid, "projects", name);
      const oldSnap = await getDoc(oldDocRef);
      if (!oldSnap.exists()) return;
      const oldData = oldSnap.data();
      const newDocRef = doc(db, "users", currentUser.uid, "projects", newName.trim());
      await setDoc(newDocRef, { ...oldData, name: newName.trim() });
      await deleteDoc(oldDocRef);
      setIsRenameOpen(false);
      navigate("/projects", { replace: true });
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !name) {
      console.error("Missing user or project name");
      return;
    }
    try {
      const docRef = doc(db, "users", currentUser.uid, "projects", name);
      console.log("Attempting to delete:", docRef.path);
      await deleteDoc(docRef);
      console.log("Successfully deleted project");
      setIsDeleteConfirmOpen(false);
      navigate("/projects", { replace: true });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed. Check console logs.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6 space-x-3 cursor-pointer" onClick={() => navigate("/projects")}>
          <FaArrowLeft className="text-[#c7f022] text-lg hover:text-yellow-400 transition" />
          <span className="text-white text-sm hover:underline">Back to Projects</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-[#c7f022]">
            Project: {projectData?.name || name}
          </h1>
          <div className="space-x-2">
            <button onClick={() => setIsRenameOpen(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
              Rename
            </button>
            <button onClick={() => setIsDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium">
              Delete
            </button>
          </div>
        </div>

        {/* File Upload UI */}
        <div
          className="mb-10 bg-gray-800 rounded-lg p-6 shadow-md text-center border-2 border-dashed border-[#c7f022] cursor-pointer hover:border-yellow-400 transition"
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type === "application/pdf") {
              setPdfFile(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 mb-3 text-[#c7f022]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0-9L8 16m4-4l4 4M12 4v8" />
            </svg>
            <p className="text-sm text-gray-300 mb-2">Drag & drop your PDF here or click to select</p>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="text-sm text-[#c7f022] cursor-pointer underline">Browse file</label>
            {pdfFile && <p className="mt-3 text-green-400 text-sm">Uploaded: {pdfFile.name}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <CustomButton
            text={loading ? "Generating..." : "Generate Summary"}
            containerStyles="bg-[#c7f022] py-2 px-6 rounded-md text-black font-bold hover:bg-yellow-400 transition disabled:opacity-50 w-full sm:w-auto"
            handleClick={handleGenerate}
            disabled={loading || !pdfFile}
          />
          <CustomButton
            text="Generate Study Cards"
            containerStyles="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md w-full sm:w-auto"
            handleClick={() => {
              if (userPlan !== "prime") {
                navigate("/plans");
              } else {
                handleGenerateCards();
              }
            }}
          />
          <CustomButton
            text="Generate Test"
            containerStyles="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-md w-full sm:w-auto"
            handleClick={() => {
              if (userPlan !== "prime") {
                navigate("/plans");
              } else {
                alert("Test generation not yet implemented.");
              }
            }}
          />
        </div>

        {/* Summary Block */}
        {summary && (
          <Section title="Summary">
            <p className="leading-relaxed text-gray-200">{summary}</p>
            {summaryPdfUrl && (
              <div className="mt-4">
                <a
                  href={summaryPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="text-[#c7f022] underline hover:text-yellow-400 font-semibold"
                >
                  Download Summary as PDF
                </a>
              </div>
            )}
          </Section>
        )}

        {/* Structured JSON Section Rendering */}
        {projectData?.structured?.sections && (
          <StructuredRenderer sections={projectData.structured.sections} />
        )}

        {/* Flashcards */}
        {userPlan === "prime" && cards && (
          <Section title="Flashcards">
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              {cards.map((card, i) => (
                <li key={i}>{card}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* Quiz/Test */}
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
                <button onClick={() => setIsRenameOpen(false)} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
                <button onClick={handleRename} className="px-4 py-2 text-sm bg-[#c7f022] text-black font-bold rounded">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-80 shadow-lg">
              <h2 className="text-lg font-bold text-red-400 mb-4">Delete this project?</h2>
              <p className="text-gray-300 mb-4">This action cannot be undone.</p>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 font-bold rounded">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-md">
      <h2 className="text-xl font-semibold text-[#c7f022] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StructuredRenderer({ sections }: { sections: any[] }) {
  return (
    <>
      {sections.map((section, idx) => (
        <Section title={section.heading} key={idx}>
          {section.type === "text" && (
            <p className="leading-relaxed text-gray-200 whitespace-pre-wrap">{section.content}</p>
          )}
          {section.type === "list" && Array.isArray(section.content) && (
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              {section.content.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {section.type === "quiz" && Array.isArray(section.content) && (
            <ol className="list-decimal list-inside space-y-2 text-gray-200">
              {section.content.map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          )}
        </Section>
      ))}
    </>
  );
}

export default FolderPage;
