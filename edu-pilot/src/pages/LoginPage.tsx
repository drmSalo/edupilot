import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import CustomCheckbox from "../components/CustomCheckBox";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { COLORS } from "../customSections/HeroSection";

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

  const navigate = useNavigate();

  const upsertUserDoc = async (u: any) => {
    await setDoc(
      doc(db, "users", u.uid),
      {
        uid: u.uid,
        email: u.email ?? "",
        displayName: u.displayName ?? "",
        name: "",
        surname: "",
        age: null,
        subscription: "basic",
        projectCount: 0,
        marketingOptIn: agreeEmails ?? false,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMsg(null);
      setSubmitting(true);
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithPopup(auth, googleProvider);
      await upsertUserDoc(cred.user);
      navigate("/projects", { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Google-Anmeldung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!email) {
        setErrorMsg("Gib erst deine E-Mail ein, dann Passwort zurücksetzen.");
        return;
      }
      setErrorMsg(null);
      setSubmitting(true);
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setErrorMsg("Reset-Link geschickt. Prüfe dein Postfach.");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Konnte Reset nicht senden.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setErrorMsg(null);

    if (mode === "signup" && !agreeTerms) {
      setErrorMsg("Du musst AGB & Datenschutz akzeptieren.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setErrorMsg("Passwort mindestens 6 Zeichen.");
      return;
    }

    try {
      setSubmitting(true);
      await setPersistence(auth, browserLocalPersistence);

      const mail = email.trim().toLowerCase();

      if (mode === "login") {
        await signInWithEmailAndPassword(auth, mail, password);
        navigate("/projects", { replace: true });
        return;
      }

      // signup
      const cred = await createUserWithEmailAndPassword(auth, mail, password);
      if (displayName) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch {
          /* ignore */
        }
      }
      await upsertUserDoc({ ...cred.user, displayName });
      navigate("/projects", { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Aktion fehlgeschlagen.");
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
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}22, ${COLORS.ACCENT2}11)`,
            }}
          />
          <div className="p-8">
            <div className="text-3xl font-black tracking-tight">Edu Pilot</div>
            <div className="mt-2 text-sm" style={{ color: COLORS.SUBTLE }}>
              PDFs rein — strukturierte Summary, Karten & Prüfungsfragen raus.
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
                { k: "150k+", v: "Seiten" },
                { k: "12k+", v: "Karten" },
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
                  <div
                    className="text-2xl font-black"
                    style={{ color: COLORS.PRIMARY }}
                  >
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
            style={{
              backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
            }}
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
          {/* Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-2xl font-extrabold">
              {isSignup ? "Konto erstellen" : "Anmelden"}
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
              {isSignup
                ? "Ich habe schon ein Konto"
                : "Neu hier? Jetzt registrieren"}
            </button>
          </div>

          {/* Social */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={submitting}
              className="flex items-center justify-center gap-3 rounded-xl py-3 font-semibold transition hover:opacity-90"
              style={{
                background: "white",
                color: "#111",
                border: `1px solid ${COLORS.BORDER}`,
              }}
            >
              <FcGoogle size={22} />
              Weiter mit Google
            </button>
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-3 rounded-xl py-3 font-semibold opacity-70 cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.02)",
                color: COLORS.TEXT,
                border: `1px solid ${COLORS.BORDER}`,
                backdropFilter: "blur(6px)",
              }}
              title="Kommt später"
            >
              <FaApple size={20} />
              Weiter mit Apple
            </button>
          </div>

          <div
            className="text-center text-xs mb-6"
            style={{ color: COLORS.SUBTLE }}
          >
            oder mit E-Mail fortfahren
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <input
                type="text"
                placeholder="Anzeigename (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-3 rounded-lg text-black bg-white"
                autoComplete="name"
              />
            )}

            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg text-black bg-white"
              autoComplete="email"
              required
            />

            <input
              type="password"
              placeholder="Passwort"
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
                  Passwort vergessen?
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
                        Mit der Registrierung akzeptierst du unsere{" "}
                        <span className="underline">Nutzungsbedingungen</span>{" "}
                        und <span className="underline">Datenschutz</span>.
                      </>
                    }
                  />
                  {touched && !agreeTerms && (
                    <p className="text-red-400 mt-1 ml-8 text-xs">
                      Du musst zustimmen.
                    </p>
                  )}
                </div>

                <div>
                  <CustomCheckbox
                    checked={agreeEmails}
                    onChange={(e) => setAgreeEmails(e.target.checked)}
                    label="Ich möchte Updates & Angebote erhalten."
                  />
                </div>
              </div>
            )}

            {/* Error */}
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
              {submitting
                ? isSignup
                  ? "Registrieren..."
                  : "Anmelden..."
                : isSignup
                ? "Registrieren"
                : "Anmelden"}
            </button>
          </form>

          {/* Footer toggle */}
          <div className="text-center mt-6 text-sm">
            {isSignup ? "Schon ein Konto?" : "Noch kein Konto?"}{" "}
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
              {isSignup ? "Jetzt anmelden" : "Jetzt registrieren"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
