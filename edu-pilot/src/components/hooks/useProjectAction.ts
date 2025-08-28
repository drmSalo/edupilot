// src/api/hooks/useProjectActions.ts
import { useApiClient } from "../../context/ApiProvider";

type SummaryResp = {
  model_used?: string;
  is_complex?: boolean;
  page_count?: number;
  structured?: any[];
  plan?: "prime" | "basic";
  monthly_limit?: number;
  uploads_used_this_month?: number;
  uploads_left_this_month?: number;
  month?: string;
  project_cards_regen_used_this_month?: number;
  project_quiz_regen_used_this_month?: number;
  project_cards_regen_left_this_month?: number;
  project_quiz_regen_left_this_month?: number;
  project_cards_regen_month?: string;
  project_quiz_regen_month?: string;
};

type CardsResp = {
  cards: { question: string; answer: string }[];
  monthly_limit?: number;
  uploads_used_this_month?: number;
  uploads_left_this_month?: number;
  month?: string;
  project_cards_regen_used_this_month?: number;
  project_cards_regen_left_this_month?: number;
  project_cards_regen_month?: string;
};

type QuizResp = {
  quiz: { question: string; options: string[]; correct_answer: string }[];
  monthly_limit?: number;
  uploads_used_this_month?: number;
  uploads_left_this_month?: number;
  month?: string;
  project_quiz_regen_used_this_month?: number;
  project_quiz_regen_left_this_month?: number;
  project_quiz_regen_month?: string;
};

export function useProjectActions() {
  const api = useApiClient();

  async function generateSummary(
    file: File,
    name: string,
    opts?: { signal?: AbortSignal }
  ): Promise<SummaryResp> {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    form.append("summary_variant", "auto");
    // ApiClient sets Authorization + retries on 401
    return api.postForm("/api/generate-project/", form, opts);
  }

  async function generateCards(
    name: string,
    opts?: { signal?: AbortSignal }
  ): Promise<CardsResp> {
    return api.postJson("/api/generate-study-cards/", { name }, opts);
  }

  async function generateQuiz(
    name: string,
    opts?: { signal?: AbortSignal }
  ): Promise<QuizResp> {
    return api.postJson("/api/generate-study-quiz/", { name }, opts);
  }

  return { generateSummary, generateCards, generateQuiz };
}
