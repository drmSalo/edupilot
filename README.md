# EduPilot

EduPilot is an open-source, local-first study companion. Add a text-based PDF and use a model running in [Ollama](https://ollama.com/) to create:

- exam-focused summaries at three detail levels;
- active-recall flashcards; and
- multiple-choice practice quizzes with explanations.

There are no accounts, subscriptions, hosted databases, analytics, or cloud AI keys. The browser talks to a small local Django API, study data is stored in local SQLite, and AI requests go to the Ollama URL you configure.

## How it works

```text
Browser (React)  →  Local Django API  →  Ollama /api/chat
                           ↓
                    SQLite on disk
```

PDFs are read in memory and are not saved. Extracted text and generated material are persisted in `api/data/edupilot.sqlite3`, which is ignored by Git. Scanned/image-only PDFs need OCR before upload.

## Requirements

- Python 3.10+
- Node.js 20+
- Ollama with at least one local model

## Run locally

Start Ollama and install a model (the model is your choice):

```bash
ollama serve
ollama pull gemma3:4b
```

Set up and run the backend:

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

In another terminal, start the frontend:

```bash
cd edu-pilot
npm install
npm run dev
```

Open `http://localhost:5173`, select **Settings**, connect to `http://localhost:11434`, and choose one of the discovered models.

## API

All endpoints are deliberately anonymous because this application is designed to bind to localhost.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health/` | Backend health |
| `GET`, `PUT` | `/api/settings/ollama/` | Read/update local Ollama settings |
| `GET` | `/api/ollama/models/` | Discover installed Ollama models |
| `GET`, `POST` | `/api/projects/` | List/create projects |
| `GET`, `PATCH`, `DELETE` | `/api/projects/:id/` | Manage one project |
| `POST` | `/api/projects/:id/summary/` | Upload/reuse a PDF source and summarize |
| `POST` | `/api/projects/:id/cards/` | Generate flashcards |
| `POST` | `/api/projects/:id/quiz/` | Generate a quiz |

The Ollama client uses the native `/api/tags` and `/api/chat` endpoints, with streaming disabled and JSON schemas supplied for structured output.

## Tests and checks

```bash
cd api && python manage.py test
cd edu-pilot && npm run lint && npm run build
```

## Security and network use

The default Django allowed hosts and Vite proxy are localhost-only. If you deliberately expose EduPilot on a network, add authentication and appropriate transport security first—the API contains personal study material and intentionally has no account system.

See [SECURITY.md](SECURITY.md) for reporting issues and required remediation if an old clone contains previously committed credentials.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), keep new integrations local-first, and avoid introducing mandatory hosted services.

## License

MIT — see [LICENSE](LICENSE).
