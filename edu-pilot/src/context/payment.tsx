const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function upgradeToPrime(token: string) {
  const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/plans`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Checkout failed");
  window.location.href = data.checkout_url;
}

export async function openBillingPortal(token: string) {
  const res = await fetch(`${API_BASE}/api/stripe/create-portal-session/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ return_url: `${window.location.origin}/settings` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Portal failed");
  window.location.href = data.portal_url;
}