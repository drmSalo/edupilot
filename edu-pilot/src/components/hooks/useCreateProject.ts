// hooks/useCreateProject.ts
import { useAuth } from "../../context/AuthContext";
import { setDoc, doc, Timestamp, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export const useCreateProject = () => {
  const { currentUser } = useAuth();

  const createProject = async (name: string) => {
    if (!currentUser) {
      console.warn("User not logged in");
      return;
    }

    const id = name; // <-- Ordnername als ID
    const projectRef = doc(db, "users", currentUser.uid, "projects", id);

    await setDoc(projectRef, {
      name,
      owner: currentUser.uid,
      createdAt: Timestamp.now(),
      initialized: false,
    });

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { projectCount: 1 });
    } else {
      await updateDoc(userRef, { projectCount: increment(1) });
    }

    return id;
  };

  return { createProject };
};
