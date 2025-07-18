import { useState } from "react";
import {
  FaUser,
  FaTrash,
  FaLock,
  FaSignOutAlt,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import {
  updateProfile,
  updatePassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

function ProfilePage() {
  const [activeTab, setActiveTab] = useState("details");
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [email] = useState(currentUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);

    try {
      await updateProfile(currentUser, {
        displayName,
      });

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
      }

      await currentUser.reload();
      setDisplayName(currentUser.displayName || "");

      alert("Profile updated!");
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen text-white">
      {/* Sidebar */}
      <aside className="bg-gray-800 w-full md:w-64 p-6 border-r border-[#c7f022]">
        <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
        <p className="text-sm text-gray-400 mb-8">Manage your EduPilot experience</p>

        <nav className="flex flex-col gap-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-3 px-4 py-2 rounded transition ${
              activeTab === "details" ? "bg-[#c7f022] text-black" : "hover:text-[#c7f022]"
            }`}
          >
            <FaUser /> Account Details
          </button>
          <button
            onClick={() => setActiveTab("delete")}
            className={`flex items-center gap-3 px-4 py-2 rounded transition ${
              activeTab === "delete" ? "bg-[#c7f022] text-black" : "hover:text-[#c7f022]"
            }`}
          >
            <FaTrash /> Delete Account
          </button>
        </nav>

        <hr className="border-gray-700 my-6" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded transition text-red-400 hover:text-white"
        >
          <FaSignOutAlt /> Logout
        </button>
      </aside>

      {/* Content */}
      <section className="flex-1 p-8 bg-black">
        {activeTab === "details" && (
          <div className="max-w-xl mx-auto">
            <h3 className="text-xl font-semibold mb-2">Edit Profile</h3>
            <p className="text-sm text-gray-400 mb-6">Update your account details</p>

            {/* Name */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-4 py-2 text-white"
              />
            </div>

            {/* Email (readonly) */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-4 py-2 text-gray-400 pr-10"
                />
                <FaLock className="absolute right-3 top-3 text-gray-500" />
              </div>
            </div>

            {/* Passwort */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-4 py-2 text-white"
                placeholder="Leave empty to keep current"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#c7f022] text-black px-6 py-2 rounded font-semibold hover:bg-black hover:text-[#c7f022] border border-[#c7f022] transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {activeTab === "delete" && (
          <div className="text-red-400">
            ⚠️ Account deletion is not yet active.
          </div>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;
