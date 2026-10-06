import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackScore } from '../src/scoring.js';

test('scores role-relevant terms without leaving the configured bounds', () => {
  const result = fallbackScore('React TypeScript frontend engineer with 5 years experience', 'Frontend Engineer React');
  assert.ok(result.score >= 45 && result.score <= 100);
  assert.match(result.summary, /Demo estimate/);
  assert.equal(result.recommendation.includes('recruiter'), true);
});

test('returns bounded low-confidence estimate for unrelated text', () => {
  const result = fallbackScore('A short biography without role-specific details.', 'Data Analyst SQL');
  assert.ok(result.score >= 28 && result.score <= 100);
  assert.ok(result.gaps.length > 0);
});

test('does not score protected traits as positive role evidence', () => {
  const result = fallbackScore('A candidate is 48 years old and lives in Toronto.', 'Frontend Engineer React');
  assert.equal(result.score, 45);
  assert.equal(result.strengths.length, 1);
});