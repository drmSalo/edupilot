import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Token aktiv einmal abrufen
        await user.getIdToken(true);
      }
      setCurrentUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);
  

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
