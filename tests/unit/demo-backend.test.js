import { describe, it, expect, beforeEach } from 'vitest';
import { demoRequest, resetDemo } from '../../src/lib/demoBackend';

const get = (p, q) => demoRequest('GET', p, q);
const post = (p, b) => demoRequest('POST', p, {}, b);

describe('guest preview backend', () => {
  beforeEach(() => resetDemo());

  it('walks Discover into Stage 2 and grades a ticket', async () => {
    expect((await get('journey/stage-modules')).completedModules).toBe(0);
    await post('journey/stage-modules/complete', { number: 1, moduleKey: 'welcome' });
    await demoRequest('PATCH', 'me/preferences', {}, { publicName: 'Harsha' });
    await post('course-enrollments', { versionId: 'cv-dev' });
    await post('courses/lessons/complete', { lessonId: 'dev-m1-l1', reflection: 'x'.repeat(30) });
    await post('careers/finalize', { pathwayId: 'software-development' });
    const level = await get('journey/stage-modules');
    expect(level.completedModules).toBe(4);
    expect((await get('dashboard')).journey.levels[1].state).toBe('available');

    // Starting the Development path opens Level 2 (Learn) straight away in the guest preview.
    expect((await get('stage2/batches/me')).enrolled).toBe(true);
    const overview = await get('stage2/overview');
    expect(overview.enrolled).toBe(true);
    expect(overview.cta).toMatchObject({ action: 'module', moduleId: 'UX01' });

    const c = 'S2-01-C01';
    await post('stage2/lessons/complete', { batchId: 'development-basics', conceptId: c, part: 'lesson' });
    await post('stage2/lessons/complete', { batchId: 'development-basics', conceptId: c, part: 'guided' });
    const ch = await get('stage2/challenges', { batchId: 'development-basics', conceptId: c });
    expect(ch.storage.moduleId).toBe('UX01');
    const text = 'A detailed answer that is long enough to count as specific.';
    const attempt = await post('stage2/attempts', { batchId: 'development-basics', moduleId: 'UX01', written: { understanding: text, evidence: text, diagnosis: text, change: text, verification: text } });
    expect(attempt.passed).toBe(true);
    expect((await get('stage2/progress', { batchId: 'development-basics' })).modulesCompleted).toBe(1);
    expect((await get('tunnels')).items.every((t) => t.open)).toBe(true);
  });

  it('leaves everything open for testing and offers only the Development path', async () => {
    expect((await get('pathways')).items.map((p) => p.id)).toEqual(['software-development']);
    expect((await get('journey/stage-modules')).modules.every((m) => !m.isLocked)).toBe(true);
    expect((await post('stage2/enrollment')).enrolled).toBe(true);
    const outline = await get('stage2/modules/outline', { batchId: 'development-basics', moduleId: 'UX01' });
    expect(outline.items.every((i) => i.state !== 'locked')).toBe(true);
    expect((await get('tunnels')).items.every((t) => t.open)).toBe(true);
    await expect(post('stage2/labs', {})).rejects.toMatchObject({ code: 'LABS_UNAVAILABLE' });
  });
});
