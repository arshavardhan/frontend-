import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { makeApp } from './mockApp';

vi.mock('../../src/context/AppContext', () => ({ useApp: () => globalThis.__app }));
// Real network is never used in component tests.
beforeEach(() => {
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ data: { items: [] } })) }));
});

const { default: ContentRenderer } = await import('../../src/features/learning/content/ContentRenderer');
const { default: JourneyProgressBar } = await import('../../src/components/journey/JourneyProgressBar');
const { default: JourneyMap } = await import('../../src/components/journey/JourneyMap');
const { default: HomeScreen } = await import('../../src/features/home/HomeScreen');
const { default: LevelScreen } = await import('../../src/features/journey/LevelScreen');
const { default: PathSelectionScreen } = await import('../../src/features/path-selection/PathSelectionScreen');
const { default: Tabs } = await import('../../src/components/shared/Tabs');

describe('ContentRenderer', () => {
  beforeEach(() => { globalThis.__app = makeApp(); });

  it('picks the renderer from the section type', () => {
    render(<ContentRenderer sections={[
      { id: 't', type: 'text', title: 'Intro', body: 'Hello **world**\n\n- one\n- two' },
      { id: 'v', type: 'video', title: 'Clip', url: 'https://www.youtube.com/watch?v=abc123', meta: {} },
      { id: 'r', type: 'resource', title: 'Glossary', url: 'https://example.org/a.pdf', meta: { kind: 'pdf' } },
      { id: 'u', type: 'unsupported', originalType: 'hologram', meta: {} },
    ]} />);
    expect(screen.getByText('world').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(document.querySelector('iframe').src).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveProperty('href', 'https://example.org/a.pdf');
    expect(screen.getByText(/hologram/)).toBeTruthy();
  });

  it('swaps a video for text by data alone (no code change)', () => {
    const { rerender } = render(<ContentRenderer sections={[{ id: 's', type: 'video', title: 'Intro', url: 'https://vimeo.com/42', meta: {} }]} />);
    expect(document.querySelector('iframe').src).toContain('player.vimeo.com/video/42');
    rerender(<ContentRenderer sections={[{ id: 's', type: 'text', title: 'Intro', body: 'Now a reading', meta: {} }]} />);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Now a reading')).toBeTruthy();
  });

  it('renders backend visual sections and step animations', () => {
    render(<ContentRenderer sections={[
      { id: 'vis', type: 'visual', title: 'Flow', data: { type: 'input_process_output', content: { input: { title: 'Data' }, process: { title: 'Model' }, output: { title: 'Prediction' } } }, meta: {} },
      { id: 'ani', type: 'animation', title: 'Steps', data: { type: 'step_by_step', content: { steps: [{ id: 1, title: 'Collect' }, { id: 2, title: 'Train' }] } }, meta: {} },
    ]} />);
    expect(screen.getByText('Prediction')).toBeTruthy();
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
    expect(screen.getByText('Collect')).toBeTruthy();
  });
});

describe('Journey components', () => {
  it('derives progress counts and the next milestone from milestone states', () => {
    const app = makeApp({ statuses: ['completed', 'completed', 'current'] });
    render(<JourneyProgressBar milestones={app.milestones} />);
    expect(screen.getByText('2 / 10 Levels Completed')).toBeTruthy();
    expect(screen.getByText('Start Building')).toBeTruthy();
  });

  it('renders every level as an interactive marker', () => {
    const app = makeApp({ statuses: ['completed', 'current'] });
    const onSelect = vi.fn();
    render(<JourneyMap milestones={app.milestones} onSelect={onSelect} />);
    const markers = screen.getAllByRole('button', { name: /^Level \d+:/ });
    expect(markers).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Level 4: Start Building, locked' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ level: 4, status: 'locked' }));
  });

  it('tabs support arrow-key navigation', () => {
    const onChange = vi.fn();
    render(<Tabs items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} value="a" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('Home screen', () => {
  it('opens unlocked levels and explains locked ones', () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'completed', 'current'] });
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Level 2: Learn Basics, completed' }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('stage2');
    fireEvent.click(screen.getByRole('button', { name: 'Level 3: Learn Advanced, in progress' }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('level/3');
    fireEvent.click(screen.getByRole('button', { name: 'Level 5: Networking, locked' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Complete Level 4: Start Building to unlock Networking.')).toBeTruthy();
  });

  it('switches between Map View and List View', () => {
    globalThis.__app = makeApp();
    render(<HomeScreen />);
    fireEvent.click(screen.getAllByRole('tab', { name: 'List View' })[0]);
    expect(screen.getByRole('list', { name: 'Career levels' })).toBeTruthy();
  });
});

describe('Level 1 screen', () => {
  beforeEach(() => {
    globalThis.__app = makeApp({ currentRoute: { path: 'level/1', query: {} } });
  });

  it('shows the four modules with lock state, progress and rewards', () => {
    render(<LevelScreen />);
    expect(screen.getByText('Learning Modules (4)')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Module 01: Welcome to Teklozy\. Available/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Module 02: Set Up Your Developer Profile\. Locked/ })).toBeTruthy();
    expect(screen.getByText('0 of 4 Modules Completed')).toBeTruthy();
    expect(screen.getByText('+25 XP')).toBeTruthy();
    expect(screen.getByText('Discover Badge')).toBeTruthy();
  });

  it('Start Learning opens the next available module', () => {
    render(<LevelScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Start Learning/ }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('module', { level: 1, key: 'welcome' });
  });

  it('locked modules do not open', () => {
    render(<LevelScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Module 03: Explore the Learning Paths/ }));
    expect(globalThis.__app.triggerToast).toHaveBeenCalledWith('Complete the previous module first.');
    expect(globalThis.__app.navigate).not.toHaveBeenCalled();
  });

  it('shows resources and the discussion state in their tabs', async () => {
    render(<LevelScreen />);
    fireEvent.click(screen.getByRole('tab', { name: 'Discussion' }));
    expect(await screen.findByText('Level discussions are coming soon')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Resources' }));
    expect(await screen.findByRole('group', { name: 'Filter resources' })).toBeTruthy();
  });
});

describe('Path selection', () => {
  beforeEach(() => {
    globalThis.__app = makeApp({ currentRoute: { path: 'discover', query: {} } });
  });

  it('Explore Development / Explore AI open their own path journeys', async () => {
    render(<PathSelectionScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Explore Development/ }));
    await waitFor(() => expect(globalThis.__app.navigate).toHaveBeenCalledWith('path/software-development'));
    fireEvent.click(screen.getByRole('button', { name: /Explore AI/ }));
    await waitFor(() => expect(globalThis.__app.navigate).toHaveBeenCalledWith('path/ai-engineering'));
    expect(globalThis.__app.explorePath).toHaveBeenCalledWith('ai-engineering');
  });

  it('Learn opens the introductory module and Choose Your Path finalizes on the server', async () => {
    render(<PathSelectionScreen />);
    fireEvent.click(screen.getByRole('button', { name: /^Learn$/ }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('module', { level: 1, key: 'welcome' });
    fireEvent.click(screen.getByRole('button', { name: /Choose Your Path/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Artificial Intelligence/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose Artificial Intelligence' }));
    await waitFor(() => expect(globalThis.__app.finalizePath).toHaveBeenCalledWith('ai-engineering'));
  });

  it('shows the backend Level 1 XP reward on each card', () => {
    render(<PathSelectionScreen />);
    expect(screen.getAllByTitle('Level 1 reward from the backend')).toHaveLength(2);
  });
});
