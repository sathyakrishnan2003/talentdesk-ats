import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoStore } from '../src/store.js';

test('creates and searches candidates with normalized tags', async () => {
  const store = new DemoStore();
  const created = await store.createCandidate({ name: 'Test Candidate', email: 'test@example.com', role: 'Data Analyst', tags: ['SQL'] });
  assert.equal(created.stage, 'Applied');
  assert.deepEqual(created.tags, ['SQL']);
  assert.equal((await store.listCandidates({ search: 'test@example.com' })).some((row) => row.id === created.id), true);
});

test('records every pipeline transition in candidate history', async () => {
  const store = new DemoStore();
  const candidate = await store.getCandidate(1);
  await store.moveCandidate(candidate.id, 'Screening', 'Recruiter review');
  await store.moveCandidate(candidate.id, 'Interview', 'Screen passed');
  const history = await store.listHistory(candidate.id);
  assert.equal((await store.getCandidate(candidate.id)).stage, 'Interview');
  assert.deepEqual(history.slice(0, 2).map((entry) => entry.toStage), ['Interview', 'Screening']);
  assert.equal(history[0].fromStage, 'Screening');
});

test('schedules interviews and updates interview counts', async () => {
  const store = new DemoStore();
  const interview = await store.createInterview({ candidateId: 1, title: 'Portfolio review', interviewer: 'Avery', startsAt: new Date(Date.now() + 86_400_000).toISOString() });
  assert.equal((await store.stats()).interviews, 3);
  await store.updateInterview(interview.id, { status: 'Completed' });
  assert.equal((await store.stats()).interviews, 2);
});