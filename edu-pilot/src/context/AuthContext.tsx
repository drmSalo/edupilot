import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!cancelled) {
        setCurrentUser(user);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
