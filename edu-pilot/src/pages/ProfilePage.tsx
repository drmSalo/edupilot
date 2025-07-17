import { useState } from "react";
import { FaUser,  FaTrash, FaLock } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const [activeTab, setActiveTab] = useState("details");
  const { currentUser } = useAuth();

  const displayName = currentUser?.displayName || "User";
  const email = currentUser?.email || "example@email.com";

  return (
    <div className="flex flex-col md:flex-row min-h-screen text-white">
      {/* Sidebar */}
      <aside className="bg-gray-800 w-full md:w-64 p-6 border-r border-[#c7f022]">
        <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
        <p className="text-sm text-gray-400 mb-8">
          Manage your EduPilot experience
        </p>

        <nav className="flex flex-col gap-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-3 px-4 py-2 rounded transition ${
              activeTab === "details"
                ? "bg-[#c7f022] text-black"
                : "hover:text-[#c7f022]"
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
      </aside>

      {/* Content */}
      <section className="flex-1 p-8 bg-black">
        {activeTab === "details" && (
          <div className="max-w-xl mx-auto">
            <h3 className="text-xl font-semibold mb-2">Profile</h3>
            <p className="text-sm text-gray-400 mb-6">Manage your account information</p>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-[#c84fd1] flex items-center justify-center text-lg font-bold">
                {displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <span className="text-lg">{displayName}</span>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={displayName}
                disabled
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-4 py-2 text-white"
              />
            </div>

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

            <button className="bg-[#c7f022] text-black px-6 py-2 rounded font-semibold hover:bg-black hover:text-[#c7f022] border border-[#c7f022] transition">
              Save
            </button>
          </div>
        )}

        {/* Additional Tabs */}
        {activeTab === "goals" && (
          <div className="text-gray-400">Goal management (coming soon...)</div>
        )}
        {activeTab === "delete" && (
          <div className="text-red-400">⚠️ Account deletion is not yet active.</div>
        )}
        {activeTab === "beta" && (
          <div className="text-gray-400">Beta features coming soon.</div>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;
