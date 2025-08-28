// src/components/hooks/useDjangoToken.ts
import { useEffect, useRef, useState } from "react";
import { getAuth, onIdTokenChanged, type User } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

type UseDjangoToken = {
  /** Django access token (SimpleJWT), or null if not signed in or still loading */
  token: string | null;
  /** Firebase user (if signed in) */
  user: User | null;
  /** True while we’re exchanging or re-exchanging tokens */
  loading: boolean;
  /**
   * Force refresh: refresh Firebase ID token and re-exchange for a fresh
   * Django access token. Returns the new Django token or null.
   */
  refresh: () => Promise<string | null>;
};

async function exchangeFirebaseToDjango(idToken: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/firebase/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Django auth failed");
  }
  const data = await res.json();
  if (!data?.access) throw new Error("No access token in response");
  return data.access as string; // Django SimpleJWT access token
}

export function useDjangoToken(): UseDjangoToken {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // guard against out-of-order async updates
  const genRef = useRef(0);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onIdTokenChanged(auth, async (u) => {
      const myGen = ++genRef.current;
      setUser(u);
      if (!u) {
        setToken(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fast path: don’t force refresh unless needed
        const firebaseIdToken = await u.getIdToken(false);
        const djangoAccess = await exchangeFirebaseToDjango(firebaseIdToken);
        if (genRef.current === myGen) setToken(djangoAccess);
      } catch (err) {
        console.error("Failed to exchange Firebase token:", err);
        if (genRef.current === myGen) setToken(null);
      } finally {
        if (genRef.current === myGen) setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const refresh = async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const forcedIdToken = await user.getIdToken(true); // force refresh Firebase token
      const djangoAccess = await exchangeFirebaseToDjango(forcedIdToken);
      setToken(djangoAccess);
      return djangoAccess;
    } catch (err) {
      console.error("Token refresh failed:", err);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { token, user, loading, refresh };
}
