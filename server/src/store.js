import mysql from 'mysql2/promise';

const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
const now = new Date().toISOString();
const demoCandidates = [
  { id: 1, name: 'Avery Chen', email: 'avery.chen@example.com', role: 'Senior Product Designer', location: 'Brooklyn, NY', source: 'LinkedIn', experience: 7, rating: 4, score: 91, stage: 'Interview', tags: ['Product', 'Figma', 'Portfolio'], summary: 'Design systems leader with a strong track record shipping accessible products.', createdAt: now, updatedAt: now, resumeName: null },
  { id: 2, name: 'Jordan Williams', email: 'jordan.w@example.com', role: 'Frontend Engineer', location: 'Remote', source: 'Referral', experience: 5, rating: 5, score: 88, stage: 'Screening', tags: ['React', 'TypeScript', 'Referral'], summary: 'Frontend specialist focused on performance and thoughtful developer experience.', createdAt: now, updatedAt: now, resumeName: null },
  { id: 3, name: 'Priya Nair', email: 'priya.nair@example.com', role: 'People Operations Lead', location: 'Austin, TX', source: 'Careers page', experience: 9, rating: 4, score: 84, stage: 'Offer', tags: ['People Ops', 'Leadership'], summary: 'Built people programs for distributed teams scaling from 80 to 600 employees.', createdAt: now, updatedAt: now, resumeName: null },
  { id: 4, name: 'Mateo Rivera', email: 'mateo.r@example.com', role: 'Data Analyst', location: 'Chicago, IL', source: 'Indeed', experience: 3, rating: 3, score: 78, stage: 'Applied', tags: ['SQL', 'Analytics'], summary: 'Analyst translating customer and product data into clear decisions.', createdAt: now, updatedAt: now, resumeName: null },
  { id: 5, name: 'Samira Okafor', email: 'samira.o@example.com', role: 'Senior Product Designer', location: 'Remote', source: 'Community', experience: 6, rating: 5, score: 95, stage: 'Hired', tags: ['Product', 'Design Systems', 'Hired'], summary: 'End-to-end product designer with deep research and prototyping experience.', createdAt: now, updatedAt: now, resumeName: null },
  { id: 6, name: 'Noah Patel', email: 'noah.patel@example.com', role: 'Frontend Engineer', location: 'Seattle, WA', source: 'LinkedIn', experience: 4, rating: 3, score: 72, stage: 'Rejected', tags: ['React', 'Accessibility'], summary: 'Web engineer with strong accessibility fundamentals and open-source contributions.', createdAt: now, updatedAt: now, resumeName: null },
];

const demoHistory = demoCandidates.map((candidate) => ({ id: candidate.id, candidateId: candidate.id, fromStage: null, toStage: candidate.stage, note: 'Initial stage', changedBy: 'Hiring team', changedAt: candidate.createdAt }));
const demoInterviews = [
  { id: 1, candidateId: 1, title: 'Portfolio review', interviewer: 'Morgan Lee', startsAt: new Date(Date.now() + 86_400_000).toISOString(), status: 'Scheduled', notes: '' },
  { id: 2, candidateId: 2, title: 'Technical screen', interviewer: 'Taylor Kim', startsAt: new Date(Date.now() + 172_800_000).toISOString(), status: 'Scheduled', notes: '' },
];

const toCandidate = (row) => ({ ...row, experience: Number(row.experience), rating: Number(row.rating), score: Number(row.score), tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'), createdAt: row.createdAt, updatedAt: row.updatedAt });

export class DemoStore {
  mode = 'demo';
  candidates = structuredClone(demoCandidates);
  history = structuredClone(demoHistory);
  interviews = structuredClone(demoInterviews);
  nextCandidate = 7;
  nextInterview = 3;
  async listCandidates({ search = '', stage = '', role = '' } = {}) {
    const query = search.toLowerCase();
    return this.candidates.filter((c) => (!query || `${c.name} ${c.email} ${c.role} ${c.tags.join(' ')}`.toLowerCase().includes(query)) && (!stage || c.stage === stage) && (!role || c.role === role)).sort((a, b) => b.score - a.score);
  }
  async getCandidate(id) { return this.candidates.find((c) => c.id === Number(id)) || null; }
  async createCandidate(data) {
    const date = new Date().toISOString();
    const candidate = { id: this.nextCandidate++, name: data.name, email: data.email, role: data.role, location: data.location || '', source: data.source || 'Direct', experience: Number(data.experience || 0), rating: 0, score: 0, stage: 'Applied', tags: data.tags || [], summary: data.summary || '', createdAt: date, updatedAt: date, resumeName: null };
    this.candidates.push(candidate);
    this.history.push({ id: this.history.length + 1, candidateId: candidate.id, fromStage: null, toStage: 'Applied', note: 'Candidate added', changedBy: 'Hiring team', changedAt: date });
    return candidate;
  }
  async updateCandidate(id, patch) {
    const candidate = await this.getCandidate(id);
    if (!candidate) return null;
    Object.assign(candidate, patch, { updatedAt: new Date().toISOString() });
    return candidate;
  }
  async listHistory(id) { return this.history.filter((row) => row.candidateId === Number(id)).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt) || b.id - a.id); }
  async moveCandidate(id, toStage, note = '', changedBy = 'Hiring team') {
    const candidate = await this.getCandidate(id);
    if (!candidate) return null;
    const fromStage = candidate.stage;
    if (fromStage === toStage) return candidate;
    candidate.stage = toStage;
    candidate.updatedAt = new Date().toISOString();
    this.history.push({ id: this.history.length + 1, candidateId: candidate.id, fromStage, toStage, note, changedBy, changedAt: candidate.updatedAt });
    return candidate;
  }
  async listInterviews(id) { return this.interviews.filter((item) => !id || item.candidateId === Number(id)).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)); }
  async createInterview(data) { const interview = { id: this.nextInterview++, ...data, status: 'Scheduled', notes: '' }; this.interviews.push(interview); return interview; }
  async updateInterview(id, patch) { const item = this.interviews.find((row) => row.id === Number(id)); if (!item) return null; Object.assign(item, patch); return item; }
  async stats() {
    return { total: this.candidates.length, active: this.candidates.filter((c) => !['Hired', 'Rejected'].includes(c.stage)).length, interviews: this.interviews.filter((i) => i.status === 'Scheduled').length, offers: this.candidates.filter((c) => c.stage === 'Offer').length, hired: this.candidates.filter((c) => c.stage === 'Hired').length, stageCounts: Object.fromEntries(stages.map((s) => [s, this.candidates.filter((c) => c.stage === s).length])) };
  }
}

class MySQLStore {
  mode = 'mysql';
  constructor(pool) { this.pool = pool; }
  async listCandidates({ search = '', stage = '', role = '' } = {}) {
    const where = []; const params = [];
    if (search) { where.push('(name LIKE ? OR email LIKE ? OR role LIKE ? OR tags LIKE ?)'); params.push(...Array(4).fill(`%${search}%`)); }
    if (stage) { where.push('stage = ?'); params.push(stage); }
    if (role) { where.push('role = ?'); params.push(role); }
    const [rows] = await this.pool.query(`SELECT * FROM candidates ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY score DESC, created_at DESC`, params);
    return rows.map((row) => toCandidate({ ...row, createdAt: row.created_at, updatedAt: row.updated_at }));
  }
  async getCandidate(id) { const [rows] = await this.pool.execute('SELECT * FROM candidates WHERE id = ?', [id]); return rows.length ? toCandidate({ ...rows[0], createdAt: rows[0].created_at, updatedAt: rows[0].updated_at }) : null; }
  async createCandidate(data) {
    const [result] = await this.pool.execute('INSERT INTO candidates (name,email,role,location,source,experience,rating,score,stage,tags,summary) VALUES (?,?,?,?,?,?,0,0,\'Applied\',?,?)', [data.name, data.email, data.role, data.location || '', data.source || 'Direct', Number(data.experience || 0), JSON.stringify(data.tags || []), data.summary || '']);
    await this.pool.execute('INSERT INTO stage_history (candidate_id,from_stage,to_stage,note,changed_by) VALUES (?,NULL,\'Applied\',\'Candidate added\',\'Hiring team\')', [result.insertId]);
    return this.getCandidate(result.insertId);
  }
  async updateCandidate(id, patch) {
    const allowed = ['rating', 'score', 'summary', 'resume_name', 'tags', 'location', 'source', 'experience'];
    const keys = Object.keys(patch).filter((key) => allowed.includes(key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)));
    if (keys.length) {
      const columns = keys.map((key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`));
      await this.pool.execute(`UPDATE candidates SET ${columns.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`, [...keys.map((key) => key === 'tags' ? JSON.stringify(patch[key]) : patch[key]), id]);
    }
    return this.getCandidate(id);
  }
  async listHistory(id) { const [rows] = await this.pool.execute('SELECT id,candidate_id AS candidateId,from_stage AS fromStage,to_stage AS toStage,note,changed_by AS changedBy,changed_at AS changedAt FROM stage_history WHERE candidate_id = ? ORDER BY changed_at DESC,id DESC', [id]); return rows; }
  async moveCandidate(id, toStage, note = '', changedBy = 'Hiring team') {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT stage FROM candidates WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) { await connection.rollback(); return null; }
      const fromStage = rows[0].stage;
      if (fromStage !== toStage) {
        await connection.execute('UPDATE candidates SET stage = ? WHERE id = ?', [toStage, id]);
        await connection.execute('INSERT INTO stage_history (candidate_id,from_stage,to_stage,note,changed_by) VALUES (?,?,?,?,?)', [id, fromStage, toStage, note, changedBy]);
      }
      await connection.commit();
      return this.getCandidate(id);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
  async listInterviews(id) { const [rows] = id ? await this.pool.execute('SELECT id,candidate_id AS candidateId,title,interviewer,starts_at AS startsAt,status,notes FROM interviews WHERE candidate_id = ? ORDER BY starts_at', [id]) : await this.pool.query('SELECT id,candidate_id AS candidateId,title,interviewer,starts_at AS startsAt,status,notes FROM interviews ORDER BY starts_at'); return rows; }
  async createInterview(data) { const startsAt = new Date(data.startsAt).toISOString().slice(0, 19).replace('T', ' '); const [result] = await this.pool.execute('INSERT INTO interviews (candidate_id,title,interviewer,starts_at,status,notes) VALUES (?,?,?, ?,\'Scheduled\',\'\')', [data.candidateId, data.title, data.interviewer, startsAt]); return (await this.listInterviews(data.candidateId)).find((item) => item.id === result.insertId); }
  async updateInterview(id, patch) { const keys = ['status', 'notes'].filter((key) => key in patch); if (keys.length) await this.pool.execute(`UPDATE interviews SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`, [...keys.map((key) => patch[key]), id]); const [rows] = await this.pool.execute('SELECT id,candidate_id AS candidateId,title,interviewer,starts_at AS startsAt,status,notes FROM interviews WHERE id = ?', [id]); return rows[0] || null; }
  async stats() {
    const [counts] = await this.pool.query('SELECT COUNT(*) AS total, SUM(stage NOT IN (\'Hired\',\'Rejected\')) AS active, SUM(stage = \'Offer\') AS offers, SUM(stage = \'Hired\') AS hired FROM candidates');
    const [interviews] = await this.pool.query('SELECT COUNT(*) AS interviews FROM interviews WHERE status = \'Scheduled\'');
    const [stageRows] = await this.pool.query('SELECT stage,COUNT(*) AS count FROM candidates GROUP BY stage');
    return { ...counts[0], interviews: interviews[0].interviews, stageCounts: Object.fromEntries(stages.map((stage) => [stage, 0]).map(([stage, count]) => [stage, stageRows.find((row) => row.stage === stage)?.count || count])) };
  }
}

export const validStages = stages;
export async function createStore() {
  if (!process.env.MYSQL_HOST) return new DemoStore();
  const pool = mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER || 'ats', password: process.env.MYSQL_PASSWORD || 'ats_dev_password', database: process.env.MYSQL_DATABASE || 'talentdesk', waitForConnections: true, connectionLimit: 10, decimalNumbers: true, timezone: 'Z' });
  await pool.query(`CREATE TABLE IF NOT EXISTS candidates (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(160) NOT NULL,email VARCHAR(190) NOT NULL UNIQUE,role VARCHAR(160) NOT NULL,location VARCHAR(160) NOT NULL DEFAULT '',source VARCHAR(80) NOT NULL DEFAULT 'Direct',experience DECIMAL(4,1) NOT NULL DEFAULT 0,rating TINYINT NOT NULL DEFAULT 0,score TINYINT NOT NULL DEFAULT 0,stage ENUM('Applied','Screening','Interview','Offer','Hired','Rejected') NOT NULL DEFAULT 'Applied',tags JSON NOT NULL,summary TEXT NOT NULL,resume_name VARCHAR(255),created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS stage_history (id INT AUTO_INCREMENT PRIMARY KEY,candidate_id INT NOT NULL,from_stage VARCHAR(32),to_stage VARCHAR(32) NOT NULL,note TEXT NOT NULL,changed_by VARCHAR(120) NOT NULL,changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS interviews (id INT AUTO_INCREMENT PRIMARY KEY,candidate_id INT NOT NULL,title VARCHAR(160) NOT NULL,interviewer VARCHAR(160) NOT NULL,starts_at DATETIME NOT NULL,status ENUM('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',notes TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE)`);
  return new MySQLStore(pool);
}