import { describe, it, expect } from 'vitest';
import { adaptCourseLesson, adaptStageModule, normalizeSection, resourceToSection } from '../../src/features/learning/content/adapter';

const lesson = (over = {}) => ({ id: 'l1', title: 'What is AI?', kind: 'reading', estimatedMinutes: 4, isCompleted: false, access: { allowed: true }, contentFormat: 'visual', ...over });
const course = { id: 'cv1', enrollmentId: 'e1' };

describe('content adapter', () => {
  it('maps a visual reading lesson + materials into typed sections', () => {
    const model = adaptCourseLesson({
      lesson: lesson(),
      module: { description: 'Intro' },
      course,
      pathId: 'ai-engineering',
      visual: { title: 'What is AI?', sections: [{ id: 's1', type: 'concept_explanation', content: { body: 'x' } }, { id: 'q', type: 'quick_check', content: {} }], quickCheck: { sectionId: 'q', questions: [{ id: 'q1', options: [] }] } },
      material: { resources: [{ id: 'r1', kind: 'text', title: 'Notes', body: 'Hello' }, { id: 'r2', kind: 'video', title: 'Intro video', url: 'https://youtu.be/abc' }, { id: 'r3', kind: 'pdf', title: 'Glossary', url: 'https://x.org/a.pdf' }, { id: 'r4', kind: 'code_prompt', title: 'Try it', body: 'Write a loop' }, { id: 'r5', kind: 'project_brief', title: 'Brief', body: 'Build it' }] },
    });
    expect(model.sections.map((s) => s.type)).toEqual(['visual', 'text', 'video', 'resource', 'code', 'project', 'quiz']);
    expect(model.completion).toBe('reflection');
    expect(model.sections.at(-1).data.graded).toBe(false);
    expect(model.context).toEqual({ enrollmentId: 'e1', versionId: 'cv1', lessonId: 'l1', pathId: 'ai-engineering' });
  });

  it('turns quiz lessons into a graded quiz section and assignments into a graded project', () => {
    const quiz = adaptCourseLesson({ lesson: lesson({ kind: 'quiz' }), course });
    expect(quiz.sections).toHaveLength(1);
    expect(quiz.sections[0]).toMatchObject({ type: 'quiz', data: { graded: true } });
    const assignment = adaptCourseLesson({ lesson: lesson({ kind: 'assignment' }), course, material: { resources: [] } });
    expect(assignment.sections.at(-1)).toMatchObject({ type: 'project', data: { graded: true } });
    expect(assignment.completion).toBe('graded');
  });

  it('marks visual sections flagged as animation as the animation type', () => {
    const model = adaptCourseLesson({ lesson: lesson(), course, visual: { sections: [{ id: 'a', type: 'step_by_step', content: { presentation: 'animation', steps: [] } }] } });
    expect(model.sections[0].type).toBe('animation');
  });

  it('accepts the snake_case authoring contract and flags unknown types', () => {
    expect(normalizeSection({ section_id: 'section-002', type: 'video', title: 'Platform Introduction', content_url: 'VIDEO_URL' })).toMatchObject({ id: 'section-002', type: 'video', url: 'VIDEO_URL' });
    expect(normalizeSection({ section_id: 'x', type: 'text', content: 'Welcome' }).body).toBe('Welcome');
    expect(normalizeSection({ type: 'hologram' })).toMatchObject({ type: 'unsupported', originalType: 'hologram' });
  });

  it('maps every backend resource kind', () => {
    const kinds = { text: 'text', article: 'text', documentation: 'text', video: 'video', pdf: 'resource', slides: 'resource', external: 'resource', project_brief: 'project', code_prompt: 'code', sql_prompt: 'code' };
    for (const [kind, type] of Object.entries(kinds)) expect(resourceToSection({ id: kind, kind, title: kind, url: 'https://a.b' }).type).toBe(type);
    expect(resourceToSection({ id: 's', kind: 'sql_prompt', title: 's', body: 'q' }).meta.language).toBe('sql');
  });

  it('builds Level 1 orientation and profile modules from backend data', () => {
    const milestones = [{ level: 1, name: 'Discover', desc: 'a' }, { level: 2, name: 'Learn Basics', desc: 'b' }];
    const paths = [{ id: 'p1', name: 'Development', desc: 'd', tags: ['Frontend'], xpReward: 25 }];
    const welcome = adaptStageModule({ module: { key: 'welcome', title: 'Welcome to Teklozy', description: 'Get familiar', completionRule: 'orientation', estimatedMinutes: 6 }, milestones, paths });
    expect(welcome.completion).toBe('orientation');
    expect(welcome.sections.map((s) => s.type)).toEqual(['text', 'visual', 'visual']);
    expect(welcome.sections[1].data.content.nodes).toHaveLength(2);
    const profile = adaptStageModule({ module: { key: 'developer-profile', title: 'Profile', description: 'Create.', completionRule: 'profile_setup' }, preferences: { public_name: 'A' } });
    expect(profile.sections[1]).toMatchObject({ type: 'project', data: { task: 'profile' } });
    expect(profile.sections[0].body.startsWith('Create.\n')).toBe(true);
  });
});
