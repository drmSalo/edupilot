import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Slider from "../components/Slider";
import CustomButton from "../components/CustomButton";
import CustomCheckbox from "../components/CustomCheckBox";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeEmails, setAgreeEmails] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/projects", { replace: true });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);
    if (!agreeTerms) return;

    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Benutzer-Dokument in Firestore anlegen
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        name: "",
        surname: "",
        age: null,
        subscription: "basic", // Default Abo-Typ
        projectCount: 0,
      });

      navigate("/projects", { replace: true });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Benutzer-Dokument ggf. in Firestore anlegen, falls noch nicht vorhanden
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        name: "",
        surname: "",
        age: null,
        subscription: "basic",
        projectCount: 0,
      }, { merge: true });

      navigate("/projects", { replace: true });
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex px-4 flex-row py-5">
      <div className="bg-[#000] p-5 rounded-tl-2xl rounded-bl-2xl w-full max-w-md shadow-xl mb-5">
        <h1 className="text-3xl font-bold text-[#c7f022] mb-16 text-center mt-8">
          Edu Pilot
        </h1>

        <div className="flex flex-col gap-4 mb-8">
          <button
            className="flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 rounded-full hover:opacity-90 transition"
            onClick={handleGoogleLogin}
            type="button"
          >
            <FcGoogle size={24} />
            Log in with Google
          </button>

          <button className="flex border border-white items-center justify-center gap-3 bg-black text-white font-semibold py-3 rounded-full hover:opacity-90 transition">
            <FaApple size={24} />
            Log in with Apple
          </button>
        </div>

        <p className="text-gray-300 font-extralight text-center my-8">
          {isSignup ? "Or create your account" : "Or continue with email"}
        </p>

        <form
          onSubmit={isSignup ? handleSignUp : handleLogin}
          className="flex flex-col gap-6"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg text-black bg-white"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg text-black bg-white"
            required
          />

          {!isSignup && (
            <CustomButton
              text="Forgot your password?"
              textStyles="text-[#c7f022] hover:underline cursor-pointer text-right"
              containerStyles=""
              btnType="button"
              handleClick={() => {}}
            />
          )}

          {isSignup && (
            <div className="mt-2 text-sm text-white space-y-4">
              <div>
                <CustomCheckbox
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  label={
                    <>
                      By signing up, you agree to Edu Pilot’s{" "}
                      <span className="underline">Terms of Service</span> and{" "}
                      <span className="underline">Privacy Policy</span>.
                    </>
                  }
                />
                {triedSubmit && !agreeTerms && (
                  <p className="text-red-400 mt-1 ml-8 text-xs">
                    You must agree to the Terms of Service and Privacy Policy.
                  </p>
                )}
              </div>

              <div>
                <CustomCheckbox
                  checked={agreeEmails}
                  onChange={(e) => setAgreeEmails(e.target.checked)}
                  label="I want to receive updates and offers."
                />
                {triedSubmit && !agreeEmails && (
                  <p className="text-yellow-400 mt-1 ml-8 text-xs">
                    You won’t receive any updates or special offers.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="bg-[#c7f022] text-black font-bold py-3 rounded-full hover:bg-white transition mt-10"
          >
            {isSignup ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="text-center mt-8 text-white text-sm">
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <button
            className="text-[#c7f022] hover:underline font-semibold"
            onClick={() => {
              setIsSignup((prev) => !prev);
              setTriedSubmit(false);
              setAgreeTerms(false);
              setAgreeEmails(false);
            }}
            type="button"
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </div>
      </div>

      <div className="bg-[#c7f022] w-full mb-5 rounded-tr-2xl rounded-br-2xl">
        <Slider />
      </div>
    </div>
  );
}

export default LoginPage;
