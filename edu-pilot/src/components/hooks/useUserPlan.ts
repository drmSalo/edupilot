// hooks/useUserPlan.ts
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase"; 
import { useAuth } from "../../context/AuthContext";

export const useUserPlan = (): "basic" | "prime" => {
  const { currentUser } = useAuth();
  const [plan, setPlan] = useState<"basic" | "prime">("basic");

  useEffect(() => {
    const fetchPlan = async () => {
      if (!currentUser) return;
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setPlan(data.subscription === "prime" ? "prime" : "basic");
        }
      } catch {
        setPlan("basic");
      }
    };
    fetchPlan();
  }, [currentUser]);

  return plan;
};
