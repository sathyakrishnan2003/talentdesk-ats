# TalentDesk ATS

A full-stack recruiting workspace built with React, Node.js/Express, and MySQL. It includes candidate profiles and tags, a six-stage interview pipeline with a durable change history, interview scheduling, and resume scoring through Groq.

## Features

- Candidate directory with search and stage filtering, role/source details, recruiter ratings, and editable tags.
- Pipeline stages: Applied, Screening, Interview, Offer, Hired, and Rejected. Every stage change records its previous stage, note, actor, and timestamp.
- Interview scheduling and completion/cancellation tracking.
- PDF, DOCX, and TXT resume upload (8 MB max). The server extracts text and requests a job-related score, evidence strengths, and gaps from Groq. The Groq key stays on the server. If no key is configured, a clearly labeled deterministic demo estimate is used.
- MySQL persistence when `MYSQL_HOST` is configured; a seeded in-memory demo workspace when it is not.

The resume score is an assistive signal only. It must not be used as an automatic hiring decision. Recruiters should review the resume and scorecard themselves. Resume text is sent to Groq only when a Groq API key is configured; review Groq's current data-retention terms before using real candidate information.

## Run today (demo mode)

Requirements: Node.js 20.19+ (or 22.12+) and npm. Docker is optional for demo mode.

```powershell
npm install
npm run dev
```

Open <http://localhost:5173>. The API runs on port 3001 and uses seeded example candidates until MySQL is configured. Demo changes last only while the API process is running. Add `GROQ_API_KEY` to `server/.env` to enable Groq scoring; without it, resume scoring uses the demo estimate.

## Run with MySQL

1. Start Docker Desktop and create the local API settings:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

2. Launch the production-built React app, API, and MySQL together:

   ```powershell
   docker compose --env-file server/.env up -d --build
   ```

Open <http://localhost:3001>. The API creates its three tables (candidates, stage history, and interviews) on startup. Set `GROQ_API_KEY` in `server/.env` to enable Groq; never put this key in the React environment or commit it. Without that setting, the UI remains usable and identifies scores as demo estimates. Replace the example database passwords before exposing this setup beyond a local demo.

## Quality checks

```powershell
npm test
npm run build
```

## Deployment

The included Dockerfile builds the React client and serves it from Express alongside the API. For production, publish that image to a container host and use managed MySQL; set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` from the managed database, set `CLIENT_ORIGIN` to the deployed origin, and store `GROQ_API_KEY` as a server-side secret. Expose only HTTPS endpoints, use a managed database with backups, and place authenticated access controls in front of the ATS before storing real candidate data. Uploads are processed in memory and are not retained as files.

### Render demo deployment

The included `render.yaml` deploys the Docker app as a Render web service and uses `/api/health` for health checks. Connect the Git repository containing this file in the Render Dashboard and create a Blueprint instance. The optional `GROQ_API_KEY` is prompted as a secret during initial setup. Without `MYSQL_HOST`, the service runs the seeded in-memory demo store; demo changes are lost when the service restarts. Render's Blueprint-managed database offering is PostgreSQL, which this app does not use. To enable persistent candidate data, configure the `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` environment variables for an external MySQL provider in the Render service settings.

Do not store real candidate information in the public demo deployment. The app currently has no authentication or authorization layer; add and verify recruiter access controls before connecting production data.

This workspace does not include a Git remote, database host, Groq key, or hosting credentials. Those are required to publish a live production instance; local demo mode runs without them.