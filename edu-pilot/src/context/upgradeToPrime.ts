// context/payment.ts (or wherever you call your backend)
export async function upgradeToPrime(djangoToken: string) {
  const res = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${djangoToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      success_url: `${window.location.origin}/projects?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/plans`,
    }),
  });
  if (!res.ok) {
    throw new Error((await res.json()).error || "Failed to start checkout");
  }
  const { checkout_url } = await res.json();
  window.location.href = checkout_url;
}
