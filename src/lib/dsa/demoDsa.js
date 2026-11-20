import DATA from './dsaData';
import { learnerRecord, solutionAllowed, starterCode, stubAnswer } from './judgeCore';
import { judgeInBrowser } from './browserJudge';

/**
 * Guest-preview answers for the DSA Dungeon routes (dsa/*, genie/*), shaped like the backend's
 * dsaDungeon.service and codingGenie.service. Nothing is locked in the guest preview, and
 * JavaScript is judged in the browser on the examples plus a sample of the hidden tests.
 */

const LANGUAGES = DATA.languages;
const bySlug = new Map(DATA.problems.map((p) => [p.slug, p]));
const ofChapter = (id) => DATA.problems.filter((p) => p.chapter === id);
const slotOf = (id) => DATA.slots.find((s) => s.id === id);

function store(s) {
  if (!s.dsa) s.dsa = { progress: {}, drafts: {}, submissions: [], genie: {} };
  return s.dsa;
}
const row = (d, slug) => d.progress[slug];
const ensureRow = (d, slug) => (d.progress[slug] ??= { status: 'not_started', solved_via: null, bookmarked: false, attempts: 0, hints_revealed: 0 });

function problemOr404(slug, fail) {
  const p = bySlug.get(slug);
  if (!p) throw fail(404, 'NOT_FOUND', 'Problem not found');
  return p;
}

function chapterSummaries(d) {
  return DATA.chapters.map((c) => {
    const ps = ofChapter(c.id);
    const solved = ps.filter((p) => row(d, p.slug)?.status === 'solved').length;
    const state = ps.length && solved >= ps.length ? 'completed' : solved > 0 ? 'in_progress' : 'available';
    const slot = slotOf(c.id);
    return {
      ...c, total: ps.length, solved, percent: ps.length ? Math.round((solved / ps.length) * 100) : 0,
      unlocked: true, state, inAppCount: ps.filter((p) => p.judge).length,
      independent: slot?.independent ?? null, related: slot?.related ?? [],
    };
  });
}

const rewards = (done) => [
  { id: 'xp', label: 'XP', xp: null, earned: done },
  { id: 'dsa-badge', label: 'DSA Badge', earned: done },
  { id: 'certificate', label: 'Certificate', earned: done },
];

const card = (d, p) => {
  const r = row(d, p.slug);
  return {
    slug: p.slug, title: p.title, difficulty: p.difficulty, patterns: p.patterns, sheetDay: p.sheetDay, links: p.links,
    inApp: Boolean(p.judge), status: r?.status ?? 'not_started', solvedVia: r?.solved_via ?? null, bookmarked: r?.bookmarked ?? false,
  };
};

function dungeon(d) {
  const chapters = chapterSummaries(d);
  const solved = Object.values(d.progress).filter((r) => r.status === 'solved').length;
  const total = DATA.problems.length;
  const current = chapters.find((c) => c.state !== 'completed') ?? chapters[0];
  const next = ofChapter(current.id).find((p) => row(d, p.slug)?.status !== 'solved');
  const chaptersCompleted = chapters.filter((c) => c.state === 'completed').length;
  return {
    title: 'DSA Dungeon',
    summary: 'A quest through the Striver SDE Sheet: ten chapters, solved in the browser or on the linked site.',
    sheet: { name: 'Striver SDE Sheet', problems: total, days: 27 },
    languages: LANGUAGES,
    progress: { chaptersCompleted, chaptersTotal: chapters.length, problemsSolved: solved, problemsTotal: total, percent: Math.round((solved / total) * 100) },
    goal: { title: `Solve all ${total} problems and complete every chapter.`, chapters: chapters.map((c) => ({ id: c.id, title: c.title, solved: c.solved, total: c.total, state: c.state })) },
    chapters,
    rewards: rewards(chaptersCompleted === chapters.length),
    continue: next ? { chapterId: current.id, slug: next.slug, title: next.title } : null,
  };
}

function chapter(d, chapterId, difficulty, fail) {
  const summaries = chapterSummaries(d);
  const c = summaries.find((x) => x.id === chapterId);
  if (!c) throw fail(404, 'NOT_FOUND', 'Chapter not found');
  const all = ofChapter(chapterId);
  const counts = { all: all.length, easy: 0, medium: 0, hard: 0 };
  all.forEach((p) => { counts[p.difficulty] += 1; });
  const problems = all.filter((p) => !difficulty || p.difficulty === difficulty).map((p, i) => ({ number: i + 1, ...card(d, p) }));
  const next = all.find((p) => row(d, p.slug)?.status !== 'solved');
  return {
    chapter: c,
    track: summaries.map((x) => ({ id: x.id, number: x.number, title: x.title, unlocked: x.unlocked, state: x.state })),
    counts, problems, rewards: rewards(c.state === 'completed'),
    continue: next ? { slug: next.slug, title: next.title } : null,
  };
}

function problem(d, slug, fail) {
  const p = problemOr404(slug, fail);
  const list = ofChapter(p.chapter);
  const index = list.findIndex((x) => x.slug === slug);
  const r = row(d, slug);
  const base = {
    ...card(d, p), chapter: DATA.chapters.find((c) => c.id === p.chapter), number: index + 1,
    previous: list[index - 1]?.slug ?? null, next: list[index + 1]?.slug ?? null, attempts: r?.attempts ?? 0,
  };
  if (!p.judge) return { ...base, judge: null };
  const j = p.judge;
  const revealed = r?.hints_revealed ?? 0;
  return {
    ...base,
    judge: {
      statement: j.statement, constraints: j.constraints, examples: j.examples, signature: j.signature,
      languages: LANGUAGES.map((language) => ({ language, starterCode: starterCode(j.signature, language), draft: d.drafts[`${slug}|${language}`] ?? null })),
      testCaseCount: j.testCaseCount,
      hints: { total: 3, revealed, items: j.hints.slice(0, revealed) },
    },
    preview: { judgedLanguages: ['javascript'], sampleTests: j.demoTests.length },
  };
}

const describe = (j, k) => (k < j.examples.length ? j.examples[k].input : j.hiddenInputs[k - j.examples.length]);

async function execute(p, language, code, tests, fail) {
  if (language !== 'javascript')
    throw fail(503, 'JUDGE_UNAVAILABLE', 'The guest preview judges JavaScript in your browser. Python, Java and C++ run on the Teklozy judge: sign in with the backend running to use them.');
  if (!code?.trim()) throw fail(400, 'VALIDATION_ERROR', 'Write some code first');
  return judgeInBrowser(p.judge, code, tests);
}

function failedCase(p, r) {
  if (r.failedIndex === null) return r.compile && !r.compile.ok ? { compileOutput: r.compile.output } : null;
  const c = r.cases[r.failedIndex];
  return { index: c.index, input: describe(p.judge, c.index), expected: c.expected, output: c.output, error: c.error, console: c.console.slice(0, 2000) };
}

function record(d, p, language, mode, code, r) {
  const id = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  d.submissions.unshift({ id, slug: p.slug, language, mode, code, verdict: r.verdict, passed: r.passed, total: r.total, runtime_ms: r.runtimeMs, failed_case: failedCase(p, r), created_at: new Date().toISOString() });
  d.submissions = d.submissions.slice(0, 60);
  return id;
}

function genieContext(d, p) {
  const r = row(d, p.slug);
  const j = p.judge;
  const last = d.submissions.find((x) => x.slug === p.slug);
  return {
    title: p.title, difficulty: p.difficulty, patterns: p.patterns, inApp: Boolean(j), statement: j?.statement ?? null,
    constraints: j?.constraints ?? [], signature: j?.signature ?? null, hints: j?.hints ?? [], hintsRevealed: r?.hints_revealed ?? 0,
    approach: j?.approach ?? null, solved: r?.status === 'solved',
    failedSubmits: Math.max(0, (r?.attempts ?? 0) - (r?.status === 'solved' ? 1 : 0)),
    lastAttempt: last ? { language: last.language, code: last.code, verdict: last.verdict, passed: last.passed, total: last.total, failedCase: last.failed_case, mode: last.mode } : null,
    links: p.links,
  };
}

/** Handles one guest-preview request for the DSA Dungeon; `s` is the saved guest state. */
export async function dsaDemoRoute(method, path, q, body, s, fail, onActivity) {
  const d = store(s);
  switch (path) {
    case 'dsa/dungeon': return dungeon(d);
    case 'dsa/chapter': return chapter(d, q.chapterId, q.difficulty || null, fail);
    case 'dsa/problem': return problem(d, q.slug, fail);
    case 'dsa/problem/draft': {
      problemOr404(body.slug, fail);
      d.drafts[`${body.slug}|${body.language}`] = String(body.code ?? '').slice(0, 65536);
      return { ok: true };
    }
    case 'dsa/problem/run': {
      const p = problemOr404(body.slug, fail);
      if (!p.judge) throw fail(409, 'EXTERNAL_PROBLEM', 'Practise this problem on the linked site and mark it solved');
      const j = p.judge;
      const examples = j.demoTests.filter((t) => t.example);
      const r = await execute(p, body.language, body.code, examples, fail);
      onActivity();
      record(d, p, body.language, 'run', body.code, r);
      return { ...r, cases: r.cases.map((c) => ({ ...c, input: describe(j, c.index), custom: false })) };
    }
    case 'dsa/problem/submit': {
      const p = problemOr404(body.slug, fail);
      if (!p.judge) throw fail(409, 'EXTERNAL_PROBLEM', 'Practise this problem on the linked site and mark it solved');
      const r = await execute(p, body.language, body.code, p.judge.demoTests, fail);
      onActivity();
      const submissionId = record(d, p, body.language, 'submit', body.code, r);
      const pr = ensureRow(d, p.slug);
      if (pr.status !== 'solved') {
        pr.attempts += 1;
        pr.status = r.verdict === 'accepted' ? 'solved' : 'attempted';
        if (r.verdict === 'accepted') pr.solved_via = 'judge';
      }
      return { submissionId, verdict: r.verdict, passed: r.passed, total: r.total, runtimeMs: r.runtimeMs, compile: r.compile, failedCase: failedCase(p, r), status: pr.status, attempts: pr.attempts, preview: true };
    }
    case 'dsa/problem/hint': {
      const p = problemOr404(body.slug, fail);
      if (!p.judge) throw fail(409, 'EXTERNAL_PROBLEM', 'This problem has no in-app hints');
      const pr = ensureRow(d, p.slug);
      pr.hints_revealed = Math.min(3, pr.hints_revealed + 1);
      return { revealed: pr.hints_revealed, total: 3, items: p.judge.hints.slice(0, pr.hints_revealed) };
    }
    case 'dsa/problem/bookmark': {
      problemOr404(body.slug, fail);
      const pr = ensureRow(d, body.slug);
      pr.bookmarked = Boolean(body.bookmarked);
      return { bookmarked: pr.bookmarked };
    }
    case 'dsa/problem/self-report': {
      const p = problemOr404(body.slug, fail);
      if (p.judge) throw fail(409, 'USE_THE_JUDGE', 'This problem is judged in the app; submit a solution instead');
      onActivity();
      const pr = ensureRow(d, p.slug);
      pr.status = 'solved';
      pr.solved_via = 'self_reported';
      return { status: pr.status, solvedVia: pr.solved_via };
    }
    case 'dsa/problem/submissions':
      problemOr404(q.slug, fail);
      return { items: d.submissions.filter((x) => x.slug === q.slug).map(({ code, ...rest }) => rest) };
    case 'dsa/submission': {
      const sub = d.submissions.find((x) => x.id === q.id);
      if (!sub) throw fail(404, 'NOT_FOUND', 'Submission not found');
      return sub;
    }
    case 'genie/thread': {
      const p = problemOr404(q.slug, fail);
      return { messages: d.genie[p.slug] ?? [], provider: 'stub', solutionUnlocked: solutionAllowed(genieContext(d, p)), modes: ['explain', 'approach', 'hint', 'debug', 'review', 'ask', 'solution'] };
    }
    case 'genie/ask': {
      const p = problemOr404(body.slug, fail);
      const ctx = genieContext(d, p);
      if (body.mode === 'ask' && !body.message?.trim()) throw fail(400, 'MESSAGE_REQUIRED', 'Type a question for the genie');
      if (body.mode === 'solution' && !solutionAllowed(ctx))
        throw fail(403, 'SOLUTION_LOCKED', 'Solve it, or reveal all hints and submit 3 times, to unlock the full solution');
      let revealed = ctx.hintsRevealed;
      if (body.mode === 'hint' && p.judge && ctx.hintsRevealed < 3) {
        const pr = ensureRow(d, p.slug);
        pr.hints_revealed += 1;
        revealed = pr.hints_revealed;
        ctx.hintsRevealed = revealed - 1;
      }
      const reply = stubAnswer(body.mode, ctx, body);
      const thread = (d.genie[p.slug] ??= []);
      const at = new Date().toISOString();
      thread.push({ role: 'learner', mode: body.mode, content: learnerRecord(body.mode, body), created_at: at }, { role: 'genie', mode: body.mode, content: reply, created_at: at });
      d.genie[p.slug] = thread.slice(-40);
      return { mode: body.mode, reply, provider: 'stub', hintsRevealed: revealed, solutionUnlocked: solutionAllowed(genieContext(d, p)) };
    }
    default:
      throw fail(404, 'NOT_FOUND', `The guest preview has no ${path} endpoint`);
  }
}
