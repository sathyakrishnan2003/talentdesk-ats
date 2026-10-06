# TalentDesk ATS project notes

- Frontend: React 19, Vite, and lucide-react in `client/`.
- API: Node.js 20+, Express, mysql2 in `server/`.
- Start locally with `npm install` and `npm run dev`; run the API suite with `npm test` and build the UI with `npm run build`.
- MySQL configuration lives in `server/.env`; never commit credentials. With no `MYSQL_HOST`, the API uses an in-memory demo data store.
- Resume scoring calls Groq only from the API when `GROQ_API_KEY` is configured. Without a key it reports deterministic demo estimates.
- Keep stage history transactional in MySQL and maintain parity with `DemoStore` for API behavior.
- Candidate scores are advisory only; never use them to make automatic employment decisions.