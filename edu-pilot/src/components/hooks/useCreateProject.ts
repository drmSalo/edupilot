import { doc, serverTimestamp, runTransaction } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";

function slugifyId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "project";
}

export const useCreateProject = () => {
  const { currentUser } = useAuth();

  const createProject = async (name: string) => {
    if (!currentUser) throw new Error("not_logged_in");

    const id = slugifyId(name);
    const userRef = doc(db, "users", currentUser.uid);
    const projectRef = doc(db, "users", currentUser.uid, "projects", id);

    await runTransaction(db, async (tx) => {
      const u = await tx.get(userRef);
      const projectSnap = await tx.get(projectRef);
      if (projectSnap.exists()) throw new Error("project_exists");

      tx.set(projectRef, {
        name,
        owner: currentUser.uid,
        createdAt: serverTimestamp(),
        initialized: false,
      });

      const currentCount = u.exists() ? Number(u.data()?.projectCount || 0) : 0;
      tx.set(userRef, { projectCount: currentCount + 1 }, { merge: true });
    });

    return id;
  };

  return { createProject };
};
