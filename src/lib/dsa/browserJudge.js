import { buildProgram, crashMessage, matches, parseRun, verdictOf } from './judgeCore';

/**
 * Runs a JavaScript solution in a Web Worker exactly as the backend judge runs it in Node: the same
 * program (prelude + learner code + driver), the same token input, and the same verdict rules.
 * Used by the guest preview, which has no sandbox server.
 */

const WORKER_SOURCE = `
self.onmessage = (event) => {
  const { program, input } = event.data;
  let stdout = '';
  let stderr = '';
  const LIMIT = 4000000;
  const write = (s) => { stdout += String(s); if (stdout.length > LIMIT) throw new Error('Output limit exceeded'); return true; };
  const show = (args) => args.map((a) => { if (typeof a === 'string') return a; try { return JSON.stringify(a); } catch { return String(a); } }).join(' ');
  const console = {
    log: (...a) => write(show(a) + '\\n'), info: (...a) => write(show(a) + '\\n'), debug: (...a) => write(show(a) + '\\n'),
    warn: (...a) => { stderr += show(a) + '\\n'; }, error: (...a) => { stderr += show(a) + '\\n'; },
  };
  const process = { stdout: { write }, stderr: { write: (s) => { stderr += s; return true; } }, exit: () => {}, argv: [], env: {} };
  const require = (name) => {
    if (name === 'fs') return { readFileSync: () => input };
    throw new Error("Cannot find module '" + name + "'");
  };
  try {
    new Function('require', 'process', 'console', 'module', 'exports', program)(require, process, console, {}, {});
    self.postMessage({ stdout, stderr, exitCode: 0 });
  } catch (e) {
    self.postMessage({ stdout, stderr: stderr + String(e && e.stack ? e.stack : e), exitCode: 1 });
  }
};
`;

let workerUrl = null;
const workerBlobUrl = () => {
  if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  return workerUrl;
};

function runProgram(program, input, limitMs) {
  return new Promise((resolve) => {
    const started = performance.now();
    const worker = new Worker(workerBlobUrl());
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ stdout: '', stderr: '', exitCode: 124, timedOut: true, durationMs: limitMs });
    }, limitMs);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ...e.data, timedOut: false, durationMs: performance.now() - started });
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ stdout: '', stderr: e.message || 'The program crashed', exitCode: 1, timedOut: false, durationMs: performance.now() - started });
    };
    worker.postMessage({ program, input });
  });
}

const nonceOf = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Same result shape as the backend's execute(): verdict, compile, cases, passed, total, failedIndex, runtimeMs. */
export async function judgeInBrowser(judge, code, tests) {
  const program = buildProgram(judge.signature, 'javascript', code).files['main.js'];
  try {
    // eslint-disable-next-line no-new-func
    new Function('require', 'process', 'console', 'module', 'exports', program);
  } catch (e) {
    const line = String(e.message || e);
    return { verdict: 'compile_error', compile: { ok: false, output: `SyntaxError: ${line}` }, cases: [], passed: 0, total: tests.length, failedIndex: null, runtimeMs: null, crash: null };
  }
  const nonce = nonceOf();
  const input = [nonce, String(tests.length), ...tests.map((t) => t.tokens)].join(' ');
  // Browsers are slower to start than Node; allow the server's JavaScript limit plus headroom.
  const limit = Math.min(25_000, 1500 + (judge.timeLimitMs ?? 1500) * 3);
  const run = await runProgram(program, input, limit);
  const runs = parseRun(run.stdout, nonce, tests.length);
  const returnType = judge.signature.kind === 'function' ? judge.signature.returns : 'void';
  // eslint-disable-next-line no-new-func
  const validator = judge.validator ? new Function(`return (${judge.validator});`)() : null;
  const passed = runs.map((r, k) => r.status === 'ok' && (validator
    ? Boolean(validator(tests[k].input, r.value))
    : matches(tests[k].expected, r.value, judge.compare ?? 'exact', returnType)));
  const v = verdictOf({ runs, passed, exitCode: run.exitCode, timedOut: run.timedOut });
  const crashed = v.failedIndex !== null && runs[v.failedIndex].status === 'missing';
  return {
    verdict: v.verdict,
    compile: { ok: true, output: '' },
    cases: runs.map((r, k) => ({
      index: k,
      passed: passed[k],
      status: r.status,
      expected: tests[k].expected,
      output: r.value ?? null,
      error: r.error ?? (crashed && k === v.failedIndex
        ? (v.verdict === 'time_limit_exceeded' ? `Time limit exceeded (${limit} ms for all cases)` : crashMessage(run.exitCode, run.stderr))
        : null),
      console: r.console,
      ms: r.ms,
    })),
    passed: passed.filter(Boolean).length,
    total: tests.length,
    failedIndex: v.failedIndex,
    runtimeMs: v.verdict === 'accepted' ? Math.round(runs.reduce((s, r) => s + (r.ms ?? 0), 0) * 100) / 100 : null,
    crash: crashed ? crashMessage(run.exitCode, run.stderr) : null,
  };
}
