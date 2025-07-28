import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft } from "react-icons/fa";
import { getAuth } from "firebase/auth";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

function TestPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
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
          setQuiz(data.quiz || []);
        } else {
          console.warn("No document found for this user/project.");
        }
      } catch (err) {
        console.error("Failed to fetch quiz:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
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
          Test: {name}
        </h1>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : Array.isArray(quiz) && quiz.length > 0 ? (
          <div className="space-y-6">
            {quiz.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800 p-6 rounded-lg shadow-md text-gray-200"
              >
                <p className="font-semibold text-lg mb-2">
                  Q{index + 1}: {item.question}
                </p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  {item.options.map((opt, i) => (
                    <li
                      key={i}
                      className={
                        opt === item.correct_answer
                          ? "text-green-400"
                          : "text-gray-300"
                      }
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-red-400">No test/quiz available for this project.</p>
        )}
      </div>
    </div>
  );
}

export default TestPage;
