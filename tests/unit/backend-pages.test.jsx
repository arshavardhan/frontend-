import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import Sidebar from '../../src/components/Sidebar';
import CodeLabPage from '../../src/pages/CodeLabPage';
import GenericPage from '../../src/pages/GenericPage';

const { get, useApp } = vi.hoisted(() => ({ get: vi.fn(), useApp: vi.fn() }));
vi.mock('../../src/context/AppContext', () => ({ useApp }));
vi.mock('../../src/lib/api', () => ({
  api: { get },
  errorMessage: (error) => error.message,
}));

beforeEach(() => {
  get.mockReset();
});

it('shows the account requirement in guest mode without making protected API requests', () => {
  useApp.mockReturnValue({ isGuest: true, paths: [], logout: vi.fn() });
  render(<><CodeLabPage /><GenericPage type="challenges" /></>);
  expect(screen.getByText('Sign in to use CodeLab')).toBeTruthy();
  expect(screen.getByText('Sign in to use Challenges')).toBeTruthy();
  expect(get).not.toHaveBeenCalled();
});

it('loads practice and module labs for the enrolled batch and opens a practice workspace', async () => {
  const navigate = vi.fn();
  useApp.mockReturnValue({ stage2: { enrolled: true, batch: { id: 'development-basics' } }, navigate });
  get.mockResolvedValueOnce({ items: [
    { challengeId: 'FE03-late-response', moduleId: 'FE03', kind: 'lab', title: 'Late customer response' },
  ] }).mockResolvedValueOnce({ modules: [
    { id: 'FE03', status: 'published', kind: 'lab', label: 'JavaScript Behavior', state: 'locked' },
  ] });
  render(<CodeLabPage />);
  fireEvent.click(await screen.findByRole('button', { name: /late customer response/i }));
  expect(get).toHaveBeenCalledWith('stage2/validation-challenges', { batchId: 'development-basics' });
  expect(navigate).toHaveBeenCalledWith('stage2/ticket', {
    batch: 'development-basics', module: 'FE03', challenge: 'FE03-late-response', view: 'lab',
  });
  expect(screen.getByRole('button', { name: /javascript behavior/i })).toBeTruthy();
});

it('replaces challenge loading with a retryable error and loads real results after retry', async () => {
  const path = { id: 'software-development', name: 'Development' };
  useApp.mockReturnValue({ selectedPath: path, paths: [path] });
  get.mockRejectedValueOnce(new Error('Backend unavailable')).mockResolvedValueOnce({ items: [] });
  render(<GenericPage type="challenges" />);
  expect((await screen.findByRole('alert')).textContent).toContain('Backend unavailable');
  expect(screen.queryByText(/loading challenges/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No challenges for this path yet.')).toBeTruthy();
});


it('opens CodeLab from the left sidebar button', () => {
  const navigate = vi.fn();
  const setMobileMenuOpen = vi.fn();
  useApp.mockReturnValue({
    currentRoute: { path: 'home' }, navigate, setMobileMenuOpen, xp: 0, milestones: [],
  });
  render(<Sidebar />);
  fireEvent.click(screen.getByRole('button', { name: 'CodeLab' }));
  expect(navigate).toHaveBeenCalledWith('build');
  expect(screen.queryByRole('button', { name: 'Stage 2' })).toBeNull();
  expect(setMobileMenuOpen).toHaveBeenCalledWith(false);
});
