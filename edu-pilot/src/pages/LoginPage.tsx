import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import CustomCheckbox from "../components/CustomCheckBox";
import { FcGoogle } from "react-icons/fc";
import { COLORS } from "../customSections/HeroSection";
import upsertUserDoc from "../context/upsertUserDoc"

function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeEmails, setAgreeEmails] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate("/projects", { replace: true });
  }, [currentUser, navigate]);

  const handleResetPassword = async () => {
    try {
      if (!email) {
        setErrorMsg("Enter your email first, then reset password.");
        return;
      }
      setErrorMsg(null);
      setSubmitting(true);
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setErrorMsg("Reset link sent. Check your inbox.");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMsg(null);
      setSubmitting(true);
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithPopup(auth, googleProvider);
      // ✅ ensure Firestore user doc exists/updated
      await upsertUserDoc(cred.user, agreeEmails);
      // navigation via useEffect
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Google login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setErrorMsg(null);

    if (mode === "signup" && !agreeTerms) {
      setErrorMsg("You must accept Terms & Privacy.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      await setPersistence(auth, browserLocalPersistence);
      const mail = email.trim().toLowerCase();

      if (mode === "login") {
        await signInWithEmailAndPassword(auth, mail, password);
        return; // navigation via useEffect
      }

      // SIGNUP
      const cred = await createUserWithEmailAndPassword(auth, mail, password);
      if (displayName) {
        try { await updateProfile(cred.user, { displayName }); } catch {}
      }
      // ✅ create the Firestore user doc on first signup
      await upsertUserDoc({ ...cred.user, displayName }, agreeEmails);
      // navigation via useEffect
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: `radial-gradient(1200px 800px at 10% -10%, ${COLORS.PRIMARY}22, transparent 60%), radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%), ${COLORS.BG}`,
        color: COLORS.TEXT,
      }}
    >
      <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT – Visual/Marketing */}
        <div
          className="relative overflow-hidden rounded-3xl hidden lg:block"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(10px)",
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}22, ${COLORS.ACCENT2}11)` }}
          />
          <div className="p-8">
            <div className="text-3xl font-black tracking-tight">Edu Pilot</div>
            <div className="mt-2 text-sm" style={{ color: COLORS.SUBTLE }}>
              Upload PDFs — get structured summaries, cards & exam questions.
            </div>
          </div>
          <div>
            <video
              src="/loginVideo.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                { k: "150k+", v: "Pages" },
                { k: "12k+", v: "Study Cards" },
                { k: "98%", v: "Happy" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "rgba(8,12,24,0.30)",
                    border: `1px solid ${COLORS.BORDER}`,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <div className="text-2xl font-black" style={{ color: COLORS.PRIMARY }}>
                    {s.k}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.SUBTLE }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            aria-hidden
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{ backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})` }}
          />
        </div>

        {/* RIGHT – Auth Card */}
        <div
          className="rounded-3xl p-8 sm:p-10"
          style={{
            background: COLORS.GLASS,
            border: `1px solid ${COLORS.BORDER}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="text-2xl font-extrabold">
              {isSignup ? "Create Account" : "Login"}
            </div>
            <button
              className="text-sm font-semibold"
              style={{ color: COLORS.PRIMARY }}
              onClick={() => {
                setMode((m) => (m === "login" ? "signup" : "login"));
                setTouched(false);
                setAgreeTerms(false);
                setAgreeEmails(false);
                setErrorMsg(null);
              }}
              type="button"
            >
              {isSignup ? "I already have an account" : "New here? Sign up now"}
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={submitting}
              className="flex items-center justify-center gap-3 rounded-xl py-3 font-semibold transition hover:opacity-90"
              style={{ background: "white", color: "#111", border: `1px solid ${COLORS.BORDER}` }}
            >
              <FcGoogle size={22} />
              Continue with Google
            </button>
            
          </div>

          <div className="text-center text-xs mb-6" style={{ color: COLORS.SUBTLE }}>
            oder mit E-Mail fortfahren
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <input
                type="text"
                placeholder="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-3 rounded-lg text-black bg-white"
                autoComplete="name"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg text-black bg-white"
              autoComplete="email"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg text-black bg-white"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />

            {mode === "login" ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={submitting}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: COLORS.PRIMARY }}
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <div className="mt-2 text-sm space-y-3">
                <div>
                  <CustomCheckbox
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    label={
                      <>
                        By signing up you accept our{" "}
                        <span className="underline">Terms of Service</span> and{" "}
                        <span className="underline">Privacy Policy.</span>.
                      </>
                    }
                  />
                  {touched && !agreeTerms && (
                    <p className="text-red-400 mt-1 ml-8 text-xs">You must agree.</p>
                  )}
                </div>

                <div>
                  <CustomCheckbox
                    checked={agreeEmails}
                    onChange={(e) => setAgreeEmails(e.target.checked)}
                    label="I want to receive updates & offers."
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                className="text-sm rounded-lg p-3"
                style={{
                  background: `${COLORS.ACCENT2}22`,
                  border: `1px solid ${COLORS.ACCENT2}55`,
                  color: COLORS.TEXT,
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (isSignup && !agreeTerms)}
              className="w-full rounded-xl font-bold py-3 transition disabled:opacity-60"
              style={{
                color: "#00131a",
                backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
              }}
            >
              {submitting ? (isSignup ? "Signing up..." : "Logging in...") : isSignup ? "Sign Up" : "Login"}
            </button>
          </form>

          <div className="text-center mt-6 text-sm">
            {isSignup ? "Already have an account?" : "Don’t have an account yet?"}{" "}
            <button
              className="font-semibold hover:underline"
              style={{ color: COLORS.PRIMARY }}
              onClick={() => {
                setMode((m) => (m === "login" ? "signup" : "login"));
                setTouched(false);
                setAgreeTerms(false);
                setAgreeEmails(false);
                setErrorMsg(null);
              }}
              type="button"
            >
              {isSignup ? "Login now" : "Sign up now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
