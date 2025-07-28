import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft } from "react-icons/fa";
import { getAuth } from "firebase/auth";

interface Card {
  question: string;
  answer: string;
}

function CardsPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      const user = getAuth().currentUser;
      const uid = user?.uid;

      if (!uid || !name) {
        console.warn("Missing UID or name, aborting fetch.");
        return;
      }

      try {
        const docRef = doc(db, "users", uid, "projects", name);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCards(data.cards || []);
        } else {
          console.warn("No document found for this user/project.");
        }
      } catch (err) {
        console.error("Failed to fetch cards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
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
          Study Cards: {name}
        </h1>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : Array.isArray(cards) && cards.length > 0 ? (
          <div className="space-y-6">
            {cards.map((card, i) => (
              <div
                key={i}
                className="bg-gray-800 p-6 rounded-lg shadow-md text-gray-200"
              >
                <p className="font-semibold text-lg mb-2">
                  Q{i + 1}: {card.question}
                </p>
                <p className="text-sm text-green-400">→ {card.answer}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-red-400">No study cards available for this project.</p>
        )}
      </div>
    </div>
  );
}

export default CardsPage;
