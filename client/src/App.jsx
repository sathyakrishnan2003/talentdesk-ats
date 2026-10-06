import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownUp, ArrowRight, BadgeCheck, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, FileText, Filter, LayoutDashboard, MoreHorizontal, Plus, Search, Settings2, Sparkles, Star, Tag, UsersRound, X } from 'lucide-react';
import { api } from './api.js';

const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidates', icon: UsersRound },
  { id: 'pipeline', label: 'Pipeline', icon: Activity },
  { id: 'interviews', label: 'Interviews', icon: CalendarDays },
];
const initials = (name = '') => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const colors = ['mint', 'coral', 'blue', 'yellow', 'pink', 'lavender'];
const prettyDate = (value, options = { month: 'short', day: 'numeric' }) => new Date(value).toLocaleDateString('en-US', options);
const prettyTime = (value) => new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function Avatar({ name, index = 0, size = '' }) { return <span className={`avatar avatar-${colors[index % colors.length]} ${size}`}>{initials(name)}</span>; }
function Score({ value }) { return <span className={`score ${value >= 85 ? 'score-high' : value >= 70 ? 'score-mid' : 'score-low'}`}><Sparkles size={12} />{value || '—'}{value ? '%' : ''}</span>; }

function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => { const onKey = (event) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header className="modal-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>{children}</section></div>;
}

function CandidateForm({ onSave, onClose, busy }) {
  const [form, setForm] = useState({ name: '', email: '', role: '', location: '', source: 'LinkedIn', experience: '', tags: '' });
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return <Modal eyebrow="New profile" title="Add a candidate" onClose={onClose}>
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }); }}>
      <label>Full name<input required autoFocus value={form.name} onChange={update('name')} placeholder="e.g. Morgan Alvarez" /></label>
      <label>Email address<input required type="email" value={form.email} onChange={update('email')} placeholder="morgan@company.com" /></label>
      <div className="form-row"><label>Role<input required value={form.role} onChange={update('role')} placeholder="Product designer" /></label><label>Location<input value={form.location} onChange={update('location')} placeholder="Remote" /></label></div>
      <div className="form-row"><label>Source<select value={form.source} onChange={update('source')}><option>LinkedIn</option><option>Referral</option><option>Careers page</option><option>Indeed</option><option>Community</option><option>Direct</option></select></label><label>Years of experience<input type="number" min="0" max="60" step="0.5" value={form.experience} onChange={update('experience')} placeholder="4" /></label></div>
      <label>Tags <span className="field-hint">separate with commas</span><input value={form.tags} onChange={update('tags')} placeholder="React, Referral, Senior" /></label>
      <div className="form-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button disabled={busy} className="button button-dark"><Plus size={15} />{busy ? 'Adding…' : 'Add candidate'}</button></div>
    </form>
  </Modal>;
}

function InterviewForm({ candidates, onSave, onClose, busy }) {
  const [form, setForm] = useState({ candidateId: candidates[0]?.id || '', title: 'Introductory call', interviewer: '', date: '', time: '' });
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return <Modal eyebrow="Calendar" title="Schedule interview" onClose={onClose}>
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, startsAt: new Date(`${form.date}T${form.time}`).toISOString() }); }}>
      <label>Candidate<select required value={form.candidateId} onChange={update('candidateId')}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.role}</option>)}</select></label>
      <label>Interview type<input required value={form.title} onChange={update('title')} placeholder="Portfolio review" /></label>
      <label>Interviewer<input required value={form.interviewer} onChange={update('interviewer')} placeholder="Your name" /></label>
      <div className="form-row"><label>Date<input required type="date" value={form.date} onChange={update('date')} min={new Date().toISOString().slice(0, 10)} /></label><label>Time<input required type="time" value={form.time} onChange={update('time')} /></label></div>
      <div className="form-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button disabled={busy || !candidates.length} className="button button-dark"><CalendarDays size={15} />{busy ? 'Scheduling…' : 'Schedule interview'}</button></div>
    </form>
  </Modal>;
}

function CandidateDetail({ candidate, onClose, onChange, notify }) {
  const [history, setHistory] = useState([]);
  const [tagInput, setTagInput] = useState(candidate.tags.join(', '));
  const [scoreResult, setScoreResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef(null);
  useEffect(() => { api.history(candidate.id).then(setHistory).catch((error) => notify(error.message, 'error')); }, [candidate.id, notify]);
  const changeStage = async (stage) => { try { const updated = await api.moveCandidate(candidate.id, stage); onChange(updated); setHistory(await api.history(candidate.id)); notify(`Moved to ${stage}`); } catch (error) { notify(error.message, 'error'); } };
  const saveTags = async () => { try { const tags = [...new Set(tagInput.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 12); onChange(await api.updateCandidate(candidate.id, { tags })); notify('Tags updated'); } catch (error) { notify(error.message, 'error'); } };
  const rate = async (rating) => { try { onChange(await api.updateCandidate(candidate.id, { rating })); } catch (error) { notify(error.message, 'error'); } };
  const scoreResume = async (file) => {
    if (!file) return;
    setBusy(true); setScoreResult(null);
    try { const result = await api.scoreResume(candidate.id, file); onChange(result.candidate); setScoreResult(result); notify(result.provider === 'groq' ? 'AI review complete' : 'Demo score complete · add a Groq key for AI scoring'); }
    catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); if (uploadRef.current) uploadRef.current.value = ''; }
  };
  return <Modal wide eyebrow="Candidate profile" title={candidate.name} onClose={onClose}>
    <div className="profile-top"><Avatar name={candidate.name} index={candidate.id} size="avatar-large" /><div className="profile-intro"><strong>{candidate.role}</strong><span>{candidate.email} · {candidate.location || 'Location not set'}</span></div><Score value={candidate.score} /></div>
    <div className="profile-grid">
      <div className="profile-main">
        <section className="profile-section"><div className="section-label"><Tag size={14} />Candidate tags</div><div className="tag-edit"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} aria-label="Candidate tags separated by commas" /><button className="button button-quiet button-small" onClick={saveTags}>Save tags</button></div><p className="field-hint">Separate tags with commas. Up to 12 tags.</p></section>
        <section className="profile-section"><div className="section-label"><ArrowRight size={14} />Pipeline stage</div><div className="stage-options">{stages.map((stage) => <button key={stage} className={`stage-choice ${candidate.stage === stage ? 'stage-choice-active' : ''}`} onClick={() => changeStage(stage)}>{candidate.stage === stage && <Check size={12} />}{stage}</button>)}</div></section>
        <section className="profile-section"><div className="section-label"><Star size={14} />Recruiter rating</div><div className="rating-row">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} className={`rating-star ${rating <= candidate.rating ? 'rating-active' : ''}`} onClick={() => rate(rating)} aria-label={`Rate ${rating} out of 5`}><Star size={19} fill={rating <= candidate.rating ? 'currentColor' : 'none'} /></button>)}<span>{candidate.rating ? `${candidate.rating} of 5` : 'Not rated'}</span></div></section>
        <section className="profile-section"><div className="section-label"><Sparkles size={14} />Resume intelligence</div><p className="profile-summary">{candidate.summary || 'Upload a resume to get a job-relevant summary, strengths, and evidence gaps.'}</p><input ref={uploadRef} className="visually-hidden" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => scoreResume(event.target.files?.[0])} /><button className="button button-lime button-small" disabled={busy} onClick={() => uploadRef.current?.click()}><Sparkles size={14} />{busy ? 'Reviewing resume…' : candidate.resumeName ? 'Re-score resume' : 'Upload & score resume'}</button><span className="field-hint">PDF, DOCX or TXT · max 8 MB · {candidate.resumeName || 'No resume attached'}</span>{scoreResult && <div className="score-report"><div className="score-report-top"><strong>{scoreResult.score}% role match</strong><span>{scoreResult.provider === 'groq' ? 'GROQ AI' : 'DEMO ESTIMATE'}</span></div><p>{scoreResult.summary}</p>{scoreResult.strengths?.length > 0 && <p><b>Evidence:</b> {scoreResult.strengths.join(' · ')}</p>}{scoreResult.gaps?.length > 0 && <p><b>To explore:</b> {scoreResult.gaps.join(' · ')}</p>}<p className="field-hint">{scoreResult.recommendation}</p></div>}</section>
      </div>
      <aside className="profile-history"><div className="section-label"><Clock3 size={14} />Stage history</div>{history.length ? <ol className="timeline">{history.map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.toStage}</strong>{event.fromStage && <span> from {event.fromStage}</span>}<p>{event.note || 'Stage updated'}</p><time>{prettyDate(event.changedAt, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div></li>)}</ol> : <p className="empty-small">No stage changes yet.</p>}</aside>
    </div>
  </Modal>;
}

function App() {
  const [view, setView] = useState('dashboard');
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, interviews: 0, offers: 0, hired: 0, stageCounts: {} });
  const [interviews, setInterviews] = useState([]);
  const [health, setHealth] = useState(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  const notify = (message, type = 'success') => { setToast({ message, type }); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setToast(null), 3600); };
  const refresh = async () => {
    const [nextCandidates, nextStats, nextInterviews, nextHealth] = await Promise.all([api.candidates(), api.stats(), api.interviews(), api.health()]);
    setCandidates(nextCandidates); setStats(nextStats); setInterviews(nextInterviews); setHealth(nextHealth); setError('');
  };
  useEffect(() => { refresh().catch((reason) => setError(reason.message)); const handler = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);

  const visibleCandidates = useMemo(() => candidates.filter((candidate) => {
    const query = search.toLowerCase();
    return (!stageFilter || candidate.stage === stageFilter) && (!query || `${candidate.name} ${candidate.email} ${candidate.role} ${candidate.tags.join(' ')}`.toLowerCase().includes(query));
  }), [candidates, search, stageFilter]);
  const upcomingInterviews = useMemo(() => interviews.filter((item) => item.status === 'Scheduled').sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)), [interviews]);
  const candidateById = (id) => candidates.find((candidate) => candidate.id === Number(id));
  const updateCandidate = (updated) => { setCandidates((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate)); setSelected(updated); refresh().catch(() => {}); };
  const openCandidate = (candidate) => setSelected(candidate);
  const saveCandidate = async (payload) => { setBusy(true); try { const created = await api.createCandidate(payload); await refresh(); setModal(''); setSelected(created); notify('Candidate added to Applied'); } catch (reason) { notify(reason.message, 'error'); } finally { setBusy(false); } };
  const saveInterview = async (payload) => { setBusy(true); try { await api.createInterview(payload); await refresh(); setModal(''); notify('Interview scheduled'); } catch (reason) { notify(reason.message, 'error'); } finally { setBusy(false); } };
  const moveStage = async (candidate, stage) => { try { await api.moveCandidate(candidate.id, stage); await refresh(); notify(`${candidate.name} moved to ${stage}`); } catch (reason) { notify(reason.message, 'error'); } };
  const markInterview = async (interview, status) => { try { await api.updateInterview(interview.id, { status }); await refresh(); notify(`Interview marked ${status.toLowerCase()}`); } catch (reason) { notify(reason.message, 'error'); } };

  const title = navItems.find((item) => item.id === view)?.label || 'Overview';
  const greeting = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Activity size={19} strokeWidth={2.5} /></span><span>talent<span className="brand-light">desk</span></span><span className="brand-dot">.</span></div>
      <div className="workspace-switch"><span className="workspace-symbol">N</span><span className="workspace-copy"><strong>Northstar Studio</strong><small>Recruiting team</small></span><ChevronDown size={14} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'nav-active' : ''}`} onClick={() => setView(id)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === 'interviews' && upcomingInterviews.length > 0 && <span className="nav-count">{upcomingInterviews.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><span className="tip-icon"><Sparkles size={14} /></span><div><strong>Good hiring, by design.</strong><p>Clear signals. Human decisions.</p></div></div><button className="nav-item sidebar-setting"><Settings2 size={16} /><span>Workspace settings</span></button><div className="user-card"><span className="user-avatar">ML</span><span className="user-copy"><strong>Morgan Lee</strong><small>Hiring manager</small></span><MoreHorizontal size={18} /></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{title}</strong></div><div className="topbar-actions"><div className={`storage-status ${health?.storage === 'mysql' ? 'storage-live' : ''}`}><span />{health?.storage === 'mysql' ? 'MySQL connected' : health?.storage === 'demo' ? 'Demo workspace' : 'Connecting'}</div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><button className="help-button" aria-label="Help"><CircleHelp size={17} /></button></div></header>
      {error && <div className="connection-alert"><Activity size={15} /><span>Could not reach the API: {error}. Start the server and try again.</span><button onClick={() => refresh().catch((reason) => setError(reason.message))}>Retry</button></div>}
      <div className="page-wrap">
        <section className="page-heading"><div><div className="eyebrow">{view === 'dashboard' ? greeting : 'TALENT OPERATIONS'}</div><h1>{view === 'dashboard' ? 'Your hiring, in focus.' : title}</h1><p>{view === 'dashboard' ? 'A thoughtful view of the people moving your team forward.' : view === 'pipeline' ? 'Every candidate, every stage. Nothing falls through.' : view === 'interviews' ? 'Keep the conversation moving.' : 'The people behind your next great hire.'}</p></div><div className="heading-actions">{view === 'interviews' && <button className="button button-quiet" onClick={() => setModal('interview')}><CalendarDays size={15} />Schedule interview</button>}<button className="button button-dark" onClick={() => setModal('candidate')}><Plus size={16} />Add candidate</button></div></section>

        {view === 'dashboard' && <>
          <section className="metric-row"><article className="metric metric-dark"><div className="metric-top"><span>Active candidates</span><span className="metric-icon"><UsersRound size={16} /></span></div><strong>{stats.active ?? 0}</strong><div className="metric-foot"><span className="metric-dot" />In active pipeline <span className="metric-detail">of {stats.total ?? 0} total</span></div></article><article className="metric"><div className="metric-top"><span>Upcoming interviews</span><span className="metric-icon metric-icon-peach"><CalendarDays size={16} /></span></div><strong>{stats.interviews ?? 0}</strong><div className="metric-foot"><span className="metric-accent">Next up</span><span className="metric-detail">{upcomingInterviews[0] ? `${prettyDate(upcomingInterviews[0].startsAt)} · ${prettyTime(upcomingInterviews[0].startsAt)}` : 'No interviews scheduled'}</span></div></article><article className="metric"><div className="metric-top"><span>Offers extended</span><span className="metric-icon metric-icon-lime"><BadgeCheck size={16} /></span></div><strong>{stats.offers ?? 0}</strong><div className="metric-foot"><span className="metric-accent">{stats.hired ?? 0} hired</span><span className="metric-detail">keep the momentum</span></div></article><article className="metric metric-score"><div className="metric-top"><span>Avg. candidate score</span><span className="metric-icon metric-icon-blue"><Sparkles size={16} /></span></div><strong>{candidates.length ? Math.round(candidates.reduce((sum, c) => sum + Number(c.score || 0), 0) / candidates.length) : 0}<small>%</small></strong><div className="metric-foot"><span className="metric-detail">Resume fit · recruiter-reviewed</span></div></article></section>
          <section className="dashboard-grid"><div className="section-panel candidate-panel"><div className="panel-head"><div><h2>Recently active</h2><p>Profiles with the latest momentum</p></div><button className="text-button" onClick={() => setView('candidates')}>All candidates <ArrowRight size={14} /></button></div><CandidateTable candidates={[...candidates].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5)} onOpen={openCandidate} compact /></div><div className="section-panel stage-panel"><div className="panel-head"><div><h2>Pipeline pulse</h2><p>Where your candidates are today</p></div><button className="icon-button panel-more" aria-label="Pipeline options"><MoreHorizontal size={18} /></button></div><div className="pipeline-stats">{stages.slice(0, 5).map((stage, index) => <div className="pipeline-stat" key={stage}><div className="pipeline-stat-name"><span className={`stage-dot stage-dot-${index}`} />{stage}<strong>{stats.stageCounts?.[stage] || 0}</strong></div><div className="progress-track"><span className={`progress-fill progress-${index}`} style={{ width: `${Math.max(4, ((stats.stageCounts?.[stage] || 0) / Math.max(stats.total, 1)) * 100)}%` }} /></div></div>)}</div><button className="stage-panel-link" onClick={() => setView('pipeline')}>View full pipeline <ArrowRight size={14} /></button></div></section>
          <section className="section-panel upcoming-panel"><div className="panel-head"><div><h2>Coming up</h2><p>Your next conversations</p></div><button className="text-button" onClick={() => setView('interviews')}>Interview calendar <ArrowRight size={14} /></button></div>{upcomingInterviews.length ? <InterviewRows interviews={upcomingInterviews.slice(0, 3)} candidateById={candidateById} onOpen={openCandidate} /> : <EmptyState title="A little calendar breathing room" detail="Schedule an interview to keep promising candidates moving." action="Schedule interview" onAction={() => setModal('interview')} />}</section>
        </>}

        {view === 'candidates' && <section className="section-panel full-panel"><div className="list-toolbar"><div className="search-box"><Search size={16} /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, roles, tags…" /><kbd>⌘ K</kbd></div><label className="filter-select"><Filter size={14} /><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="">All stages</option>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select><ChevronDown size={13} /></label><span className="result-count">{visibleCandidates.length} profiles</span></div><CandidateTable candidates={visibleCandidates} onOpen={openCandidate} /></section>}

        {view === 'pipeline' && <section className="pipeline-board">{stages.map((stage, stageIndex) => { const group = candidates.filter((candidate) => candidate.stage === stage); return <div className="pipeline-column" key={stage}><div className="column-head"><span className={`stage-dot stage-dot-${stageIndex}`} /><h2>{stage}</h2><span className="column-count">{group.length}</span><button className="icon-button column-add" aria-label={`Add candidate in ${stage}`} onClick={() => setModal('candidate')}><Plus size={15} /></button></div><div className="column-cards">{group.map((candidate) => <article className="pipeline-card" key={candidate.id}><div className="candidate-card-top"><Avatar name={candidate.name} index={candidate.id} /><button className="icon-button card-more" aria-label={`Open ${candidate.name}`} onClick={() => openCandidate(candidate)}><MoreHorizontal size={17} /></button></div><button className="pipeline-name" onClick={() => openCandidate(candidate)}>{candidate.name}</button><span className="pipeline-role">{candidate.role}</span><div className="tag-list">{candidate.tags.slice(0, 2).map((tag) => <span className="candidate-tag" key={tag}>{tag}</span>)}</div><div className="pipeline-card-foot"><Score value={candidate.score} /><select aria-label={`Move ${candidate.name} to another stage`} value={candidate.stage} onChange={(event) => moveStage(candidate, event.target.value)}>{stages.map((option) => <option key={option}>{option}</option>)}</select></div></article>)}</div></div>; })}</section>}

        {view === 'interviews' && <section className="section-panel full-panel"><div className="panel-head interview-list-head"><div><h2>Scheduled conversations</h2><p>{upcomingInterviews.length} interviews ahead</p></div><button className="button button-dark button-small" onClick={() => setModal('interview')}><Plus size={15} />Schedule interview</button></div>{upcomingInterviews.length ? <InterviewRows interviews={upcomingInterviews} candidateById={candidateById} onOpen={openCandidate} onComplete={(interview) => markInterview(interview, 'Completed')} onCancel={(interview) => markInterview(interview, 'Cancelled')} /> : <EmptyState title="Your next great conversation starts here" detail="Schedule a candidate interview and the team will see it here." action="Schedule interview" onAction={() => setModal('interview')} />}</section>}
        <footer className="page-footer"><span><span className={`footer-dot ${health?.storage === 'mysql' ? 'footer-live' : ''}`} />{health?.storage === 'mysql' ? 'MySQL persistence enabled' : 'Demo data · connect MySQL to persist changes'}</span><span>Make room for good people.</span></footer>
      </div>
    </main>

    {modal === 'candidate' && <CandidateForm onSave={saveCandidate} onClose={() => setModal('')} busy={busy} />}
    {modal === 'interview' && <InterviewForm candidates={candidates.filter((c) => !['Hired', 'Rejected'].includes(c.stage))} onSave={saveInterview} onClose={() => setModal('')} busy={busy} />}
    {selected && <CandidateDetail candidate={selected} onClose={() => setSelected(null)} onChange={updateCandidate} notify={notify} />}
    {toast && <div className={`toast toast-${toast.type}`}><span>{toast.type === 'error' ? <X size={15} /> : <Check size={15} />}</span>{toast.message}<button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button></div>}
  </div>;
}

function CandidateTable({ candidates, onOpen, compact = false }) {
  return <div className="table-scroll"><table className={`candidate-table ${compact ? 'candidate-table-compact' : ''}`}><thead><tr><th>Candidate</th><th>Role</th><th>Stage</th><th>Tags</th><th>AI score</th><th>Source</th><th aria-label="Open profile" /></tr></thead><tbody>{candidates.map((candidate) => <tr key={candidate.id} onClick={() => onOpen(candidate)}><td><div className="person-cell"><Avatar name={candidate.name} index={candidate.id} /><span><strong>{candidate.name}</strong><small>{candidate.email}</small></span></div></td><td><span className="role-cell">{candidate.role}</span></td><td><span className={`stage-pill stage-${candidate.stage.toLowerCase()}`}><i />{candidate.stage}</span></td><td><div className="tag-list table-tags">{candidate.tags.slice(0, 2).map((tag) => <span key={tag} className="candidate-tag">{tag}</span>)}{candidate.tags.length > 2 && <span className="tag-overflow">+{candidate.tags.length - 2}</span>}</div></td><td><Score value={candidate.score} /></td><td><span className="source-cell">{candidate.source}</span></td><td><button className="icon-button open-profile" onClick={(event) => { event.stopPropagation(); onOpen(candidate); }} aria-label={`Open ${candidate.name}`}><ArrowRight size={16} /></button></td></tr>)}{!candidates.length && <tr><td colSpan="7"><EmptyState title="No candidates in this search" detail="Try a different search or add someone to the pipeline." /></td></tr>}</tbody></table></div>;
}

function InterviewRows({ interviews, candidateById, onOpen, onComplete, onCancel }) {
  return <div className="interview-rows">{interviews.map((interview) => { const candidate = candidateById(interview.candidateId); return <article className="interview-row" key={interview.id}><div className="date-block"><strong>{prettyDate(interview.startsAt).split(' ')[1]}</strong><span>{prettyDate(interview.startsAt).split(' ')[0]}</span></div><div className="interview-time">{prettyTime(interview.startsAt)}</div><div className="interview-candidate">{candidate ? <button onClick={() => onOpen(candidate)}><Avatar name={candidate.name} index={candidate.id} /><span><strong>{candidate.name}</strong><small>{candidate.role}</small></span></button> : <span>Candidate profile removed</span>}</div><div className="interview-detail"><strong>{interview.title}</strong><span>with {interview.interviewer}</span></div><span className={`interview-status ${interview.status === 'Completed' ? 'status-completed' : ''}`}><i />{interview.status}</span>{onComplete && <div className="interview-actions"><button className="button button-quiet button-small" onClick={() => onComplete(interview)}><Check size={14} />Complete</button><button className="icon-button" onClick={() => onCancel(interview)} aria-label="Cancel interview"><X size={15} /></button></div>}</article>; })}</div>;
}

function EmptyState({ title, detail, action, onAction }) { return <div className="empty-state"><span className="empty-icon"><FileText size={19} /></span><strong>{title}</strong><p>{detail}</p>{action && <button className="button button-dark button-small" onClick={onAction}><Plus size={14} />{action}</button>}</div>; }

export default App;