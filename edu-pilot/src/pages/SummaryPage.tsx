import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaArrowLeft } from "react-icons/fa";
import { StructuredList } from "../components/StructuredBlock";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../customSections/HeroSection";

function SummaryPage() {
  // ID-basiert (nach Umstellung der Routes)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [structured, setStructured] = useState<any[] | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const fetchSummary = async () => {
      if (!currentUser || !id) return;
      try {
        const ref = doc(db, "users", currentUser.uid, "projects", id);
        const snap = await getDoc(ref);

        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.data() as any;
          setStructured(Array.isArray(data.structured) ? data.structured : null);
          setProjectName(typeof data.name === "string" ? data.name : id);
        } else {
          setStructured(null);
          setProjectName(id);
        }
      } catch (err) {
        console.error("Failed to fetch summary:", err);
        if (mounted) {
          setStructured(null);
          setProjectName(id);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setLoading(true);
    fetchSummary();

    return () => {
      mounted = false;
    };
  }, [currentUser, id]);

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6 lg:px-8"
      style={{
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Top-Bar */}
        <div
          className="sticky top-0 z-10 -mx-2 sm:-mx-4 px-2 sm:px-4 py-4 mb-6 backdrop-blur-md"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0))" }}
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm hover:opacity-90"
            aria-label="Back"
          >
            <FaArrowLeft style={{ color: COLORS.PRIMARY }} />
            <span className="underline underline-offset-4 decoration-[rgba(255,255,255,0.25)]">
              Back
            </span>
          </button>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            Summary: <span style={{ color: COLORS.PRIMARY }}>{projectName || "—"}</span>
          </h1>

          <div
            aria-hidden
            className="mt-4 h-[2px] w-full opacity-70"
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
          />
        </div>

        {/* Content Card */}
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
          }}
        >
          {loading ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.SUBTLE }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" style={{ color: COLORS.PRIMARY }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                <path d="M4 12a8 8 0 018-8v3.5A4.5 4.5 0 007.5 12H4z" fill="currentColor" opacity="0.9" />
              </svg>
              Loading...
            </div>
          ) : Array.isArray(structured) && structured.length > 0 ? (
            <StructuredList topics={structured} />
          ) : (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: `${COLORS.ACCENT2}22`,
                border: `1px solid ${COLORS.ACCENT2}55`,
              }}
            >
              No structured summary available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummaryPage;
