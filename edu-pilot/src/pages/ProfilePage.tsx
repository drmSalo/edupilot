import { useState } from "react";
import { FaUser, FaTrash, FaLock, FaSignOutAlt, FaChevronRight } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { updateProfile, updatePassword, deleteUser } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { COLORS } from "../customSections/HeroSection";

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"details" | "delete">("details");
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [email] = useState(currentUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");

  const toast = (text: string, type: "ok" | "err" = "ok") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    setMsg(null);

    try {
      await updateProfile(currentUser, { displayName });

      if (newPassword) {
        if (newPassword.length < 6) throw new Error("Passwort min. 6 Zeichen.");
        await updatePassword(currentUser, newPassword);
      }

      await currentUser.reload();
      setDisplayName(currentUser.displayName || "");
      setNewPassword("");
      toast("Profil aktualisiert.", "ok");
    } catch (err: any) {
      toast(err?.message || "Fehler beim Aktualisieren.", "err");
    } finally {
      setSaving(false);
    }
  };

  const deleteAllUserProjects = async (uid: string) => {
    const projectsRef = collection(db, "users", uid, "projects");
    const snapshot = await getDocs(projectsRef);
    const deletions = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletions);
  };

  const handleAccountDelete = async () => {
    if (!currentUser) return;
    const confirmDelete = window.confirm("Account wirklich dauerhaft löschen? Das kann nicht rückgängig gemacht werden.");
    if (!confirmDelete) return;

    try {
      // Projekte löschen
      await deleteAllUserProjects(currentUser.uid);
      // User-Dokument löschen
      await deleteDoc(doc(db, "users", currentUser.uid));
      // Auth-User löschen (kann 'requires-recent-login' werfen)
      await deleteUser(currentUser);
      // Zur Login-Seite
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast(err?.message || "Fehler beim Löschen. Evtl. erneut einloggen.", "err");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">

        {/* Sidebar */}
        <aside
          className="rounded-3xl p-5 h-max sticky top-6"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
          }}
        >
          <div className="mb-6">
            <div className="text-xl font-extrabold tracking-tight">Account Settings</div>
            <div className="text-xs mt-1" style={{ color: COLORS.SUBTLE }}>
              Manage your Edu Pilot experience
            </div>
            <div
              aria-hidden
              className="h-[2px] w-full mt-4"
              style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }}
            />
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition`}
              style={{
                border: `1px solid ${COLORS.BORDER}`,
                background: activeTab === "details" ? `${COLORS.PRIMARY}33` : "rgba(255,255,255,0.02)",
                backdropFilter: "blur(6px)",
                color: COLORS.TEXT,
              }}
            >
              <span className="inline-flex items-center gap-2">
                <FaUser style={{ color: COLORS.PRIMARY }} /> Account Details
              </span>
              <FaChevronRight className="opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("delete")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition`}
              style={{
                border: `1px solid ${COLORS.BORDER}`,
                background: activeTab === "delete" ? `${COLORS.ACCENT2}22` : "rgba(255,255,255,0.02)",
                backdropFilter: "blur(6px)",
                color: COLORS.TEXT,
              }}
            >
              <span className="inline-flex items-center gap-2">
                <FaTrash style={{ color: COLORS.ACCENT2 }} /> Delete Account
              </span>
              <FaChevronRight className="opacity-60" />
            </button>
          </nav>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: COLORS.BORDER }}>
            <button
              onClick={handleLogout}
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold transition hover:opacity-95 inline-flex items-center justify-center gap-2"
              style={{
                border: `1px solid ${COLORS.BORDER}`,
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(6px)",
                color: COLORS.TEXT,
              }}
            >
              <FaSignOutAlt className="text-red-400" /> Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <section
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
          }}
        >
          {/* Toast */}
          {msg && (
            <div
              className="mb-6 rounded-xl px-4 py-3 text-sm"
              style={{
                background: msgType === "ok" ? `${COLORS.PRIMARY}22` : `${COLORS.ACCENT2}22`,
                border: `1px solid ${msgType === "ok" ? `${COLORS.PRIMARY}55` : `${COLORS.ACCENT2}55`}`,
              }}
            >
              {msg}
            </div>
          )}

          {activeTab === "details" && (
            <div className="max-w-xl">
              <h3 className="text-2xl font-extrabold tracking-tight">Edit Profile</h3>
              <p className="text-sm mt-1 mb-6" style={{ color: COLORS.SUBTLE }}>
                Update your account details
              </p>

              {/* Name */}
              <div className="mb-5">
                <label className="text-xs block mb-2" style={{ color: COLORS.SUBTLE }}>
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-black"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
                />
              </div>

              {/* Email (readonly) */}
              <div className="mb-6">
                <label className="text-xs block mb-2" style={{ color: COLORS.SUBTLE }}>
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-lg px-4 py-3 text-gray-500 pr-10"
                    style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
                  />
                  <FaLock className="absolute right-3 top-3.5 text-gray-500" />
                </div>
              </div>

              {/* Password */}
              <div className="mb-8">
                <label className="text-xs block mb-2" style={{ color: COLORS.SUBTLE }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-black"
                  placeholder="Leer lassen, um aktuelles zu behalten"
                  style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl px-6 py-3 font-bold transition disabled:opacity-60"
                  style={{
                    color: "#00131a",
                    backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                    boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
                    border: "none",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "delete" && (
            <div className="max-w-xl">
              <h3 className="text-2xl font-extrabold tracking-tight text-red-400">Delete Account</h3>
              <p className="text-sm mt-1 mb-6" style={{ color: COLORS.SUBTLE }}>
                ⚠️ Deleting your account is permanent and cannot be undone.
              </p>

              <div
                className="rounded-xl p-4 mb-6"
                style={{
                  background: `${COLORS.ACCENT2}22`,
                  border: `1px solid ${COLORS.ACCENT2}55`,
                }}
              >
                <ul className="list-disc list-inside text-sm" style={{ color: COLORS.TEXT }}>
                  <li>Alle Projekte werden gelöscht.</li>
                  <li>Dein Benutzerkonto in Auth & Firestore wird entfernt.</li>
                  <li>Eventuell ist eine erneute Anmeldung nötig (Sicherheitsrichtlinie).</li>
                </ul>
              </div>

              <button
                onClick={handleAccountDelete}
                className="rounded-xl px-6 py-3 font-bold transition"
                style={{
                  background: "linear-gradient(90deg, #ef4444, #b91c1c)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "white",
                }}
              >
                Permanently Delete Account
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
