import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft } from "react-icons/fa";
import { StructuredBlock, StructuredList } from "../components/StructuredBlock";
import { getAuth } from "firebase/auth";

function SummaryPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [structured, setStructured] = useState<any | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const user = getAuth().currentUser;
      const uid = user?.uid;

      console.log("Debug → Firebase UID:", uid, "| name:", name);

      if (!uid || !name) {
        console.warn("Missing UID or name, aborting fetch.");
        return;
      }

      try {
        const docRef = doc(db, "users", uid, "projects", name);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Fetched structured:", data.structured);
          setStructured(data.structured || null);
        } else {
          console.warn("No document found for this user/project.");
        }
      } catch (err) {
        console.error("Failed to fetch summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [name]);

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div
          className="flex items-center mb-6 space-x-3 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft className="text-[#c7f022] text-lg hover:text-yellow-400 transition" />
        </div>

        <h1 className="text-3xl font-bold text-[#c7f022] mb-6">
          Summary: {name}
        </h1>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : Array.isArray(structured) && structured.length > 0 ? (
          <StructuredList topics={structured} />
        ) : (
          <p className="text-red-400">No structured summary available.</p>
        )}
      </div>
    </div>
  );
}

export default SummaryPage;
