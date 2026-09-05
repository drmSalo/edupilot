export interface Section { heading: string; content: string }
export interface Topic { title: string; sections: Section[] }
export interface Card { question: string; answer: string }
export interface QuizItem { question: string; options: string[]; correct_answer: string; explanation: string }

export interface Project {
  id: number;
  name: string;
  source_filename: string;
  page_count: number;
  model_used: string;
  has_summary: boolean;
  card_count: number;
  quiz_count: number;
  summary?: Topic[];
  cards?: Card[];
  quiz?: QuizItem[];
  created_at: string;
  updated_at: string;
}

export interface OllamaSettings { base_url: string; model: string }
export interface OllamaModel {
  name: string;
  size: number;
  details: { parameter_size?: string; quantization_level?: string };
}
