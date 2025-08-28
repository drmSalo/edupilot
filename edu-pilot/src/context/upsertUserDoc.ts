import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Create/update the Firestore user doc.
 * - First signup: create with plan "basic".
 * - Subsequent logins: update safe fields only (won’t overwrite upgrades).
 */
export default async function upsertUserDoc(
  u: any,
  marketingOptIn: boolean = false
) {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      email: u.email ?? "",
      displayName: u.displayName ?? "",
      name: "",
      surname: "",
      age: null,

      // legacy + new fields the backend reads
      subscription: "basic",
      plan: "basic",
      planStatus: "inactive",

      projectCount: 0,
      marketingOptIn: !!marketingOptIn,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    });
    return;
  }

  // Update safe fields only on later logins
  await setDoc(
    ref,
    {
      email: u.email ?? "",
      displayName: u.displayName ?? "",
      marketingOptIn: !!marketingOptIn,
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );
}
