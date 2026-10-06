const scoringSystem = 'You are a fair recruiting assistant. Score only job-relevant evidence from the resume against the role. Do not infer or score protected traits such as age, gender, race, religion, disability, nationality, or family status. Return only valid JSON with score (integer 0-100), summary (max 40 words), strengths (array of 3 short strings), gaps (array of 3 short strings), and recommendation (one sentence).';

export function fallbackScore(text, role = '') {
  const resume = text.toLowerCase();
  const tokens = role.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  const hits = tokens.filter((token) => resume.includes(token));
  const experience = resume.match(/(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience\b/i);
  const years = experience ? Number(experience[1]) : 0;
  const score = Math.min(96, Math.max(28, 45 + hits.length * 8 + Math.min(years, 8) * 2 + (resume.length > 1800 ? 5 : 0)));
  return { score, summary: `Demo estimate based on role keyword overlap and stated experience. ${hits.length} role-related term(s) matched.`, strengths: hits.slice(0, 3).length ? hits.slice(0, 3).map((hit) => `Evidence mentions ${hit}.`) : ['Resume text is available for recruiter review.'], gaps: tokens.filter((token) => !hits.includes(token)).slice(0, 3).map((token) => `No clear evidence found for ${token}.`), recommendation: 'Use this estimate only as a review aid; a recruiter should make the decision.' };
}

export async function scoreResume(text, role = '') {
  if (!process.env.GROQ_API_KEY) return { ...fallbackScore(text, role), provider: 'demo' };
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: scoringSystem }, { role: 'user', content: `Target role: ${role || 'unspecified'}\n\nResume text:\n${text.slice(0, 18000)}` }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Groq scoring failed (${response.status}). Check the server key and try again.`);
  const result = JSON.parse((await response.json()).choices[0].message.content);
  const score = Math.min(100, Math.max(0, Math.round(Number(result.score) || 0)));
  return { score, summary: String(result.summary || ''), strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 3) : [], gaps: Array.isArray(result.gaps) ? result.gaps.slice(0, 3) : [], recommendation: String(result.recommendation || ''), provider: 'groq' };
}