// hooks/useCreateProject.ts
import { useAuth } from "../../context/AuthContext";
import { setDoc, doc, Timestamp, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { v4 as uuidv4 } from "uuid";

export const useCreateProject = () => {
  const { currentUser } = useAuth();

  const createProject = async (name: string) => {
    if (!currentUser) {
      console.warn("User not logged in");
      return;
    }

    try {
      const id = uuidv4(); // eigene ID generieren
      const projectRef = doc(db, "users", currentUser.uid, "projects", id);
    
      await setDoc(projectRef, {
        name,
        owner: currentUser.uid,
        createdAt: Timestamp.now(),
      });
    
      // prüfe ob User-Dokument existiert
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          projectCount: 1,
        });
      } else {
        await updateDoc(userRef, {
          projectCount: increment(1),
        });
      }
    
      return id;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
    
  };

  return { createProject };
};
