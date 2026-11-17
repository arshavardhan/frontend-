import { describe, it, expect, vi, beforeEach } from 'vitest';
import { levelsService, leaderboardService, eventsService, learningPathsService, discussionsService, progressService, usersService } from '../../src/services/api';

const ok = (data) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ data })) });

describe('API services (existing backend contract)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => ok({}));
  });

  it('completes an orientation module with POST journey/stage-modules/complete', async () => {
    await levelsService.completeOrientation(1, 'welcome');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/v1/journey/stage-modules/complete');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ number: 1, moduleKey: 'welcome' });
    expect(init.credentials).toBe('include');
  });

  it('reads levels and leaderboard with query parameters', async () => {
    await levelsService.level(1, 'ai-engineering');
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/journey/level?number=1&pathwayId=ai-engineering');
    await leaderboardService.get('all', 3);
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/gamification/leaderboard?period=all&limit=3&offset=0');
  });

  it('registers for events and finalizes a path with confirm', async () => {
    await eventsService.register('e1');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ eventId: 'e1', state: 'registered' });
    await learningPathsService.finalize('software-development');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ pathwayId: 'software-development', confirm: true });
  });

  it('never sends XP or completion values from the client', async () => {
    await usersService.savePreferences({ journeyView: 'list', leaderboardVisible: true, publicName: 'A', xp: 999 });
    expect(Object.keys(JSON.parse(fetch.mock.calls[0][1].body)).sort()).toEqual(['journeyView', 'leaderboardVisible', 'publicName']);
  });

  it('signals an expired session on 401', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } })) }));
    const spy = vi.fn();
    window.addEventListener('teklozy:session-expired', spy);
    await expect(levelsService.journey()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reports a network error when the backend is unreachable', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new TypeError('fail')));
    await expect(levelsService.journey()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('keeps discussions isolated and unavailable (no backend API)', async () => {
    expect(discussionsService.available).toBe(false);
    await expect(discussionsService.list()).resolves.toEqual({ available: false, items: [] });
    await expect(discussionsService.post()).rejects.toMatchObject({ code: 'DISCUSSIONS_UNAVAILABLE' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stores the resume position per lesson', () => {
    progressService.saveResume('lesson:1', { index: 3 });
    expect(progressService.getResume('lesson:1')).toMatchObject({ index: 3 });
    expect(progressService.getResume('lesson:2')).toBeNull();
  });
});
