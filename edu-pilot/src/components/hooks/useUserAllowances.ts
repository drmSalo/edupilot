// src/hooks/useUserAllowances.ts
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

// Firestore Timestamp minimal-typ fürs Narrowing
type FsTimestamp = { seconds: number; nanoseconds: number };

type Allowances = {
  plan: "basic" | "prime";
  planStatus?: string;
  planCurrentPeriodEnd?: string; // ISO
  month: string;

  monthlyUploads: number;
  monthlyUploadsMonth: string;
  monthlyCardsRegen: number;
  monthlyQuizRegen: number;

  limits: {
    pdfMonthlyLimit: number;
    cardsRegenMonthlyLimit: number;
    quizRegenMonthlyLimit: number;
  };

  uploadsLeft: number;
  cardsRegenLeft: number;
  quizRegenLeft: number;

  loading: boolean;
  error?: string;
};

const DEFAULT: Allowances = {
  plan: "basic",
  planStatus: undefined,
  planCurrentPeriodEnd: undefined,
  month: "",
  monthlyUploads: 0,
  monthlyUploadsMonth: "",
  monthlyCardsRegen: 0,
  monthlyQuizRegen: 0,
  limits: { pdfMonthlyLimit: 0, cardsRegenMonthlyLimit: 5, quizRegenMonthlyLimit: 5 },
  uploadsLeft: 0,
  cardsRegenLeft: 5,
  quizRegenLeft: 5,
  loading: true,
};

function tsToISO(ts?: FsTimestamp | null): string | undefined {
  if (!ts || typeof ts.seconds !== "number") return undefined;
  return new Date(ts.seconds * 1000).toISOString();
}

export function useUserAllowances(): Allowances {
  const { currentUser } = useAuth();
  const [state, setState] = useState<Allowances>(DEFAULT);

  useEffect(() => {
    if (!currentUser?.uid) {
      setState({ ...DEFAULT, loading: false, error: "not_signed_in" });
      return;
    }

    const ref = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ ...DEFAULT, loading: false, error: "not_found" });
          return;
        }

        const d = snap.data() as any;

        const plan = (d?.plan === "prime" ? "prime" : "basic") as "basic" | "prime";
        const month = String(d?.countersMonth || "");
        const planStatus = d?.planStatus || undefined;
        const planCurrentPeriodEnd = tsToISO(d?.planCurrentPeriodEnd as FsTimestamp | undefined);

        // Limits: prefer server-provided, else derive by plan
        const derivedPdfLimit = plan === "prime" ? 180 : 0;
        const limits = {
          pdfMonthlyLimit: Number(d?.limits?.pdfMonthlyLimit ?? derivedPdfLimit),
          cardsRegenMonthlyLimit: Number(d?.limits?.cardsRegenMonthlyLimit ?? 5),
          quizRegenMonthlyLimit: Number(d?.limits?.quizRegenMonthlyLimit ?? 5),
        };

        const monthlyUploads = Number(d?.monthlyUploads ?? 0);
        const monthlyCardsRegen = Number(d?.monthlyCardsRegen ?? 0);
        const monthlyQuizRegen = Number(d?.monthlyQuizRegen ?? 0);

        setState({
          plan,
          planStatus,
          planCurrentPeriodEnd,
          month,
          monthlyUploads,
          monthlyUploadsMonth: String(d?.monthlyUploadsMonth || ""),
          monthlyCardsRegen,
          monthlyQuizRegen,
          limits,
          uploadsLeft: Math.max(0, limits.pdfMonthlyLimit - monthlyUploads),
          cardsRegenLeft: Math.max(0, limits.cardsRegenMonthlyLimit - monthlyCardsRegen),
          quizRegenLeft: Math.max(0, limits.quizRegenMonthlyLimit - monthlyQuizRegen),
          loading: false,
          error: undefined,
        });
      },
      (err) => {
        setState((s) => ({ ...s, loading: false, error: err?.message || "listener_error" }));
      }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  return useMemo(() => state, [state]);
}
