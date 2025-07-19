import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export function useDjangoToken() {
  const { currentUser } = useAuth();
  const [djangoToken, setDjangoToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (!currentUser) return;
      try {
        const firebaseToken = await currentUser.getIdToken();
        console.log('Firebase Token: ', firebaseToken);
        
        const res = await fetch("http://localhost:8000/api/auth/firebase/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: firebaseToken }),
        });

        if (!res.ok) throw new Error("Django auth failed");
        const data = await res.json();
        setDjangoToken(data.access);
      } catch (err) {
        console.error("Failed to get Django JWT:", err);
        setDjangoToken(null);
      }
    };

    fetchToken();
  }, [currentUser]);

  return djangoToken;
}
