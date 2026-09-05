import { useEffect, useMemo, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { api } from "./api";
import type { OllamaModel, OllamaSettings, Project } from "./types";

type WorkspaceTab = "summary" | "cards" | "quiz";
const markdownPlugins = [remarkGfm, remarkMath];
const htmlPlugins = [rehypeKatex, rehypeSanitize];

function formatBytes(value: number) {
  return value ? `${(value / 1024 ** 3).toFixed(1)} GB` : "";
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [settings, setSettings] = useState<OllamaSettings>({ base_url: "http://localhost:11434", model: "" });
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [tab, setTab] = useState<WorkspaceTab>("summary");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const refreshProjects = async () => setProjects(await api.listProjects());

  useEffect(() => {
    Promise.all([api.listProjects(), api.getSettings()])
      .then(([items, saved]) => {
        setProjects(items);
        setSettings(saved);
        if (!saved.model) setSettingsOpen(true);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Backend unavailable."));
  }, []);

  const openProject = async (id: number) => {
    setError("");
    try {
      setActive(await api.getProject(id));
      setTab("summary");
      setFlipped(new Set());
      setAnswers({});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open project.");
    }
  };

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong."); }
    finally { setBusy(""); }
  };

  const connectOllama = () => run("Connecting to Ollama…", async () => {
    const saved = await api.saveSettings(settings);
    setSettings(saved);
    const response = await api.listModels();
    setModels(response.models);
    if (!saved.model && response.models[0]) {
      const next = await api.saveSettings({ ...saved, model: response.models[0].name });
      setSettings(next);
    }
  });

  const selectModel = async (model: string) => {
    const next = { ...settings, model };
    setSettings(next);
    await run("Saving model…", async () => setSettings(await api.saveSettings(next)));
  };

  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const file = form.get("file") as File;
    const detail = String(form.get("detail") || "balanced");
    if (!file?.size) { setError("Choose a PDF to begin."); return; }
    void run("Reading and summarizing your PDF…", async () => {
      const created = await api.createProject(name);
      try {
        const completed = await api.summarize(created.id, file, detail);
        setActive(completed);
        setTab("summary");
        setNewProjectOpen(false);
      } finally { await refreshProjects(); }
    });
  };

  const regenerateSummary = (file: File | null, detail: string) => {
    if (!active) return;
    void run("Building your summary…", async () => {
      const updated = await api.summarize(active.id, file, detail);
      setActive(updated);
      await refreshProjects();
    });
  };

  const generateCards = () => {
    if (!active) return;
    void run("Creating flashcards…", async () => {
      const result = await api.generateCards(active.id);
      setActive({ ...active, cards: result.cards || [], card_count: result.cards?.length || 0 });
      setTab("cards");
      await refreshProjects();
    });
  };

  const generateQuiz = () => {
    if (!active) return;
    void run("Writing a practice quiz…", async () => {
      const result = await api.generateQuiz(active.id);
      setActive({ ...active, quiz: result.quiz || [], quiz_count: result.quiz?.length || 0 });
      setTab("quiz");
      setAnswers({});
      await refreshProjects();
    });
  };

  const deleteProject = () => {
    if (!active || !window.confirm(`Delete “${active.name}” and its local study data?`)) return;
    void run("Deleting project…", async () => {
      await api.deleteProject(active.id);
      setActive(null);
      await refreshProjects();
    });
  };

  const answeredCorrectly = useMemo(
    () => active?.quiz?.filter((item, index) => answers[index] === item.correct_answer).length || 0,
    [active?.quiz, answers],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActive(null)} aria-label="Open library">
          <span className="brand-mark">E</span><span>EduPilot <small>local</small></span>
        </button>
        <div className="top-actions">
          <span className={`connection ${settings.model ? "ready" : ""}`}><i /> {settings.model || "Ollama not configured"}</span>
          <button className="button ghost" onClick={() => setSettingsOpen(true)}>Settings</button>
          <button className="button primary" onClick={() => setNewProjectOpen(true)}>New study set</button>
        </div>
      </header>

      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError("")}>×</button></div>}
      {busy && <div className="busy-banner"><span className="spinner" />{busy}<small> Local models can take a moment.</small></div>}

      {!active ? (
        <main className="library">
          <section className="hero">
            <div className="eyebrow">Your private study workspace</div>
            <h1>Turn dense PDFs into<br /><em>exam-ready knowledge.</em></h1>
            <p>Summaries, flashcards, and practice quizzes powered by the Ollama models running on your machine.</p>
            <div className="hero-actions">
              <button className="button primary large" onClick={() => setNewProjectOpen(true)}>Upload your first PDF <span>→</span></button>
              <span className="privacy-note">◉ Files stay on this computer</span>
            </div>
          </section>

          <section className="project-section">
            <div className="section-heading"><div><span className="eyebrow">Library</span><h2>Your study sets</h2></div><span>{projects.length} local project{projects.length === 1 ? "" : "s"}</span></div>
            {projects.length ? (
              <div className="project-grid">
                {projects.map((project, index) => (
                  <button className="project-card" key={project.id} onClick={() => void openProject(project.id)}>
                    <span className="project-number">{String(index + 1).padStart(2, "0")}</span><div className="file-icon">PDF</div>
                    <h3>{project.name}</h3><p>{project.source_filename || "Waiting for a PDF"}</p>
                    <div className="card-meta"><span>{project.page_count || "—"} pages</span><span>{project.has_summary ? "Ready" : "Draft"}</span></div>
                  </button>
                ))}
                <button className="project-card add-card" onClick={() => setNewProjectOpen(true)}><b>+</b><span>Create a study set</span></button>
              </div>
            ) : (
              <button className="empty-state" onClick={() => setNewProjectOpen(true)}><b>Drop in a syllabus, lecture notes, or textbook chapter.</b><span>Your study library is empty. Add a PDF to begin.</span></button>
            )}
          </section>

          <section className="principles">
            <article><span>01</span><h3>Actually private</h3><p>No accounts, tracking, subscriptions, or third-party document storage.</p></article>
            <article><span>02</span><h3>Bring your model</h3><p>Use any compatible model already installed in your local Ollama library.</p></article>
            <article><span>03</span><h3>Built for recall</h3><p>Move from a focused summary to active recall cards and a scored quiz.</p></article>
          </section>
        </main>
      ) : (
        <main className="workspace">
          <aside className="workspace-sidebar">
            <button className="back" onClick={() => setActive(null)}>← All study sets</button><div className="document-chip">PDF</div>
            <h1>{active.name}</h1><p>{active.source_filename || "No PDF uploaded"}</p>
            <dl><div><dt>Pages</dt><dd>{active.page_count || "—"}</dd></div><div><dt>Model</dt><dd>{active.model_used || settings.model || "—"}</dd></div></dl>
            <nav>
              <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}><span>Summary</span><b>{active.summary?.length || 0}</b></button>
              <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><span>Flashcards</span><b>{active.cards?.length || 0}</b></button>
              <button className={tab === "quiz" ? "active" : ""} onClick={() => setTab("quiz")}><span>Practice quiz</span><b>{active.quiz?.length || 0}</b></button>
            </nav>
            <button className="delete" onClick={deleteProject}>Delete study set</button>
          </aside>
          <section className="workspace-content">
            {tab === "summary" && <SummaryView project={active} busy={Boolean(busy)} onGenerate={regenerateSummary} />}
            {tab === "cards" && <CardsView project={active} busy={Boolean(busy)} flipped={flipped} setFlipped={setFlipped} onGenerate={generateCards} />}
            {tab === "quiz" && <QuizView project={active} busy={Boolean(busy)} answers={answers} setAnswers={setAnswers} score={answeredCorrectly} onGenerate={generateQuiz} />}
          </section>
        </main>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSettingsOpen(false)}>×</button><span className="eyebrow">Local connection</span><h2>Connect Ollama</h2>
            <p>EduPilot talks directly to the Ollama service you control. No API key is needed.</p>
            <label>Ollama URL<input value={settings.base_url} onChange={(event) => setSettings({ ...settings, base_url: event.target.value })} placeholder="http://localhost:11434" /></label>
            <button className="button primary full" disabled={Boolean(busy)} onClick={connectOllama}>Connect & discover models</button>
            {models.length > 0 && <label>Study model<select value={settings.model} onChange={(event) => void selectModel(event.target.value)}>{models.map((model) => <option key={model.name} value={model.name}>{model.name} · {model.details.parameter_size || formatBytes(model.size)}</option>)}</select></label>}
            <div className="local-callout"><b>What stays local?</b><span>PDF text, summaries, cards, quizzes, and connection settings are stored in your local SQLite database.</span></div>
          </section>
        </div>
      )}

      {newProjectOpen && (
        <div className="modal-backdrop" onMouseDown={() => setNewProjectOpen(false)}>
          <form className="modal" onSubmit={createProject} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setNewProjectOpen(false)}>×</button><span className="eyebrow">New study set</span><h2>What are you studying?</h2>
            <p>Add a text-based PDF. EduPilot extracts it locally and sends the text only to your Ollama server.</p>
            <label>Study set name<input name="name" required maxLength={160} placeholder="e.g. Cognitive psychology — midterm" /></label>
            <label className="file-field"><span>PDF document</span><input name="file" type="file" required accept="application/pdf,.pdf" /></label>
            <label>Summary depth<select name="detail" defaultValue="balanced"><option value="brief">Brief — key facts</option><option value="balanced">Balanced — recommended</option><option value="detailed">Detailed — full revision</option></select></label>
            <button className="button primary full" disabled={Boolean(busy) || !settings.model}>{settings.model ? "Create study set" : "Configure Ollama first"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function SummaryView({ project, busy, onGenerate }: { project: Project; busy: boolean; onGenerate: (file: File | null, detail: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [detail, setDetail] = useState("balanced");
  return <><div className="content-heading"><div><span className="eyebrow">Study guide</span><h2>Exam summary</h2></div><button className="button secondary" disabled={busy} onClick={() => onGenerate(file, detail)}>{project.has_summary ? "Regenerate" : "Generate summary"}</button></div>
    <div className="inline-controls"><select value={detail} onChange={(event) => setDetail(event.target.value)}><option value="brief">Brief</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select><label className="compact-file">{file?.name || (project.source_filename ? "Use current PDF" : "Choose PDF")}<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label></div>
    {project.summary?.length ? <div className="summary-list">{project.summary.map((topic, index) => <article key={`${topic.title}-${index}`}><span className="topic-index">{String(index + 1).padStart(2, "0")}</span><div><h3>{topic.title}</h3>{topic.sections.map((section, sectionIndex) => <section key={`${section.heading}-${sectionIndex}`}><h4>{section.heading}</h4><ReactMarkdown remarkPlugins={markdownPlugins} rehypePlugins={htmlPlugins}>{section.content}</ReactMarkdown></section>)}</div></article>)}</div> : <EmptyTool title="No summary yet" copy="Choose a PDF above and ask your local model to build an exam-focused guide." />}
  </>;
}

function CardsView({ project, busy, flipped, setFlipped, onGenerate }: { project: Project; busy: boolean; flipped: Set<number>; setFlipped: (value: Set<number>) => void; onGenerate: () => void }) {
  return <><div className="content-heading"><div><span className="eyebrow">Active recall</span><h2>Flashcards</h2></div><button className="button secondary" disabled={busy || !project.has_summary} onClick={onGenerate}>{project.cards?.length ? "Regenerate cards" : "Generate cards"}</button></div>
    {project.cards?.length ? <><p className="instruction">Click a card to reveal the answer.</p><div className="flashcard-grid">{project.cards.map((card, index) => <button key={index} className={`flashcard ${flipped.has(index) ? "flipped" : ""}`} onClick={() => { const next = new Set(flipped); if (next.has(index)) next.delete(index); else next.add(index); setFlipped(next); }}><small>{flipped.has(index) ? "Answer" : `Card ${index + 1}`}</small><strong>{flipped.has(index) ? card.answer : card.question}</strong><span>{flipped.has(index) ? "↶ Question" : "Reveal →"}</span></button>)}</div></> : <EmptyTool title="Ready to test your recall?" copy="Generate flashcards from the summary. Your local model will focus on the highest-value ideas." />}
  </>;
}

function QuizView({ project, busy, answers, setAnswers, score, onGenerate }: { project: Project; busy: boolean; answers: Record<number, string>; setAnswers: (value: Record<number, string>) => void; score: number; onGenerate: () => void }) {
  const complete = project.quiz?.length === Object.keys(answers).length;
  return <><div className="content-heading"><div><span className="eyebrow">Practice mode</span><h2>Knowledge check</h2></div><button className="button secondary" disabled={busy || !project.has_summary} onClick={onGenerate}>{project.quiz?.length ? "New quiz" : "Generate quiz"}</button></div>
    {project.quiz?.length ? <div className="quiz-list"><div className="scoreline"><span>{Object.keys(answers).length} of {project.quiz.length} answered</span>{complete && <b>{score}/{project.quiz.length} correct</b>}</div>{project.quiz.map((item, index) => <article className="question" key={index}><small>Question {index + 1}</small><h3>{item.question}</h3><div className="options">{item.options.map((option) => { const answered = answers[index]; const state = answered ? option === item.correct_answer ? "correct" : option === answered ? "wrong" : "" : ""; return <button className={state} disabled={Boolean(answered)} onClick={() => setAnswers({ ...answers, [index]: option })} key={option}>{option}</button>; })}</div>{answers[index] && <p className="explanation"><b>{answers[index] === item.correct_answer ? "Correct." : `Answer: ${item.correct_answer}.`}</b> {item.explanation}</p>}</article>)}</div> : <EmptyTool title="Turn reading into retrieval" copy="Generate a fresh multiple-choice quiz from your summary and get instant explanations." />}
  </>;
}

function EmptyTool({ title, copy }: { title: string; copy: string }) {
  return <div className="tool-empty"><span>✦</span><h3>{title}</h3><p>{copy}</p></div>;
}

export default App;
