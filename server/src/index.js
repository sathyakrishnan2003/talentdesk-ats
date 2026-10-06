import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, validStages } from './store.js';
import { scoreResume } from './scoring.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(file.mimetype)) });
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
let store;
app.get('/api/health', (_req, res) => res.json({ status: 'ok', storage: store?.mode || 'starting', ai: process.env.GROQ_API_KEY ? 'groq' : 'demo' }));

app.get('/api/stats', asyncRoute(async (_req, res) => res.json(await store.stats())));
app.get('/api/candidates', asyncRoute(async (req, res) => res.json(await store.listCandidates({ search: String(req.query.search || '').slice(0, 120), stage: String(req.query.stage || ''), role: String(req.query.role || '') }))));
app.get('/api/candidates/:id', asyncRoute(async (req, res) => { const candidate = await store.getCandidate(req.params.id); return candidate ? res.json(candidate) : res.status(404).json({ error: 'Candidate not found' }); }));
app.post('/api/candidates', asyncRoute(async (req, res) => {
  const { name, email, role } = req.body || {};
  if (![name, email, role].every((value) => typeof value === 'string' && value.trim()) || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Name, valid email, and role are required.' });
  const tags = Array.isArray(req.body.tags) ? req.body.tags.map((tag) => String(tag).trim().slice(0, 32)).filter(Boolean).slice(0, 12) : [];
  try { res.status(201).json(await store.createCandidate({ ...req.body, name: name.trim().slice(0, 160), email: email.trim().toLowerCase().slice(0, 190), role: role.trim().slice(0, 160), tags })); }
  catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A candidate with that email already exists.' }); throw error; }
}));
app.patch('/api/candidates/:id', asyncRoute(async (req, res) => {
  const patch = {};
  if (Number.isInteger(req.body.rating) && req.body.rating >= 0 && req.body.rating <= 5) patch.rating = req.body.rating;
  if (Array.isArray(req.body.tags)) patch.tags = req.body.tags.map((tag) => String(tag).trim().slice(0, 32)).filter(Boolean).slice(0, 12);
  if (typeof req.body.location === 'string') patch.location = req.body.location.slice(0, 160);
  if (typeof req.body.source === 'string') patch.source = req.body.source.slice(0, 80);
  const candidate = await store.updateCandidate(req.params.id, patch);
  return candidate ? res.json(candidate) : res.status(404).json({ error: 'Candidate not found' });
}));
app.get('/api/candidates/:id/history', asyncRoute(async (req, res) => { if (!await store.getCandidate(req.params.id)) return res.status(404).json({ error: 'Candidate not found' }); res.json(await store.listHistory(req.params.id)); }));
app.post('/api/candidates/:id/stage', asyncRoute(async (req, res) => {
  const { stage, note, changedBy } = req.body || {};
  if (!validStages.includes(stage)) return res.status(400).json({ error: 'Choose a valid pipeline stage.' });
  const candidate = await store.moveCandidate(req.params.id, stage, String(note || '').slice(0, 500), String(changedBy || 'Hiring team').slice(0, 120));
  return candidate ? res.json(candidate) : res.status(404).json({ error: 'Candidate not found' });
}));
app.get('/api/interviews', asyncRoute(async (req, res) => res.json(await store.listInterviews(req.query.candidateId))));
app.post('/api/interviews', asyncRoute(async (req, res) => {
  const { candidateId, title, interviewer, startsAt } = req.body || {};
  if (!candidateId || !title?.trim() || !interviewer?.trim() || !startsAt || Number.isNaN(Date.parse(startsAt))) return res.status(400).json({ error: 'Candidate, interview title, interviewer, and a valid date are required.' });
  if (!await store.getCandidate(candidateId)) return res.status(404).json({ error: 'Candidate not found' });
  res.status(201).json(await store.createInterview({ candidateId: Number(candidateId), title: title.trim().slice(0, 160), interviewer: interviewer.trim().slice(0, 160), startsAt }));
}));
app.patch('/api/interviews/:id', asyncRoute(async (req, res) => {
  const patch = {};
  if (['Scheduled', 'Completed', 'Cancelled'].includes(req.body.status)) patch.status = req.body.status;
  if (typeof req.body.notes === 'string') patch.notes = req.body.notes.slice(0, 3000);
  const item = await store.updateInterview(req.params.id, patch);
  return item ? res.json(item) : res.status(404).json({ error: 'Interview not found' });
}));
app.post('/api/candidates/:id/resume-score', upload.single('resume'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a PDF, DOCX, or plain text resume up to 8 MB.' });
  const candidate = await store.getCandidate(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  let text;
  if (req.file.mimetype === 'application/pdf') { const pdf = await import('pdf-parse/lib/pdf-parse.js'); text = (await pdf.default(req.file.buffer)).text; }
  else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { const mammoth = await import('mammoth'); text = (await mammoth.extractRawText({ buffer: req.file.buffer })).value; }
  else text = req.file.buffer.toString('utf8');
  if (!text.trim()) return res.status(422).json({ error: 'Could not extract readable text from this resume.' });
  const result = await scoreResume(text, candidate.role);
  await store.updateCandidate(candidate.id, { score: result.score, summary: result.summary, resumeName: req.file.originalname.slice(0, 255) });
  res.json({ ...result, candidate: await store.getCandidate(candidate.id) });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
const clientDist = path.resolve(root, '../../client/dist');
app.use(express.static(clientDist, { index: false }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (error) => error && next(error));
});
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Resume exceeds the 8 MB limit.' : 'Resume upload was rejected.' });
  if (error.message?.startsWith('Invalid file type')) return res.status(400).json({ error: error.message });
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Unexpected server error.' });
});

const port = Number(process.env.PORT || 3001);
try {
  store = await createStore();
  app.listen(port, '0.0.0.0', () => console.log(`TalentDesk API listening on ${port} (${store.mode} storage)`));
} catch (error) {
  console.error('Could not connect to MySQL:', error.message);
  process.exit(1);
}

export { app };