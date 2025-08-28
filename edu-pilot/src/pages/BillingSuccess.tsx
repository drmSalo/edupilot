import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDjangoToken } from "../components/hooks/useDjangoToken";
import { COLORS } from "../customSections/HeroSection";

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { token: djangoToken } = useDjangoToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId || !djangoToken) return;

    (async () => {
      try {
        await fetch("/api/stripe/sync-checkout-session", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${djangoToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
      } catch (e) {
        // non-fatal; we still redirect
        console.error("Sync checkout session failed:", e);
      } finally {
        // Clean URL and go to projects
        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
        navigate("/projects", { replace: true });
      }
    })();
  }, [sessionId, djangoToken, navigate]);

  return (
    <div
      className="min-h-screen grid place-items-center"
      style={{
        background: `
          radial-gradient(1200px 800px at -10% -10%, ${COLORS.PRIMARY}22, transparent 60%),
          radial-gradient(1200px 800px at 110% 110%, ${COLORS.ACCENT2}22, transparent 60%),
          ${COLORS.BG}
        `,
        color: COLORS.TEXT,
      }}
    >
      <div className="text-center">
        <div className="mb-4 text-3xl font-bold" style={{ color: COLORS.PRIMARY }}>
          Processing your upgrade…
        </div>
        <div className="opacity-80">You’ll be redirected to your projects in a moment.</div>
      </div>
    </div>
  );
}
