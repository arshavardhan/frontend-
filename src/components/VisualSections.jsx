import React, { useState } from 'react';
import { ArrowRight, Check, Lightbulb } from 'lucide-react';

const Stage = ({ label, stage }) =>
  stage ? (
    <div className="vs-stage">
      <span className="vs-stage-label">{label}</span>
      <strong>{stage.title}</strong>
      <p>{stage.description}</p>
    </div>
  ) : null;

export function Section({ section }) {
  const c = section.content ?? {};
  switch (section.type) {
    case 'concept_explanation':
      return (
        <>
          <p className="vs-body">{c.body}</p>
          {c.highlights?.length > 0 && (
            <ul className="vs-highlights">
              {c.highlights.map((h) => <li key={h}><Check size={14} /> {h}</li>)}
            </ul>
          )}
        </>
      );
    case 'problem_solution_flow':
      return (
        <div className="vs-flow">
          <Stage label="Problem" stage={c.problem} />
          <ArrowRight className="vs-flow-arrow" size={18} />
          <Stage label="Solution" stage={c.solution} />
          <ArrowRight className="vs-flow-arrow" size={18} />
          <Stage label="Result" stage={c.result} />
        </div>
      );
    case 'input_process_output':
      return (
        <div className="vs-flow">
          <Stage label="Input" stage={c.input} />
          <ArrowRight className="vs-flow-arrow" size={18} />
          <Stage label="Process" stage={c.process} />
          <ArrowRight className="vs-flow-arrow" size={18} />
          <Stage label="Output" stage={c.output} />
        </div>
      );
    case 'process_diagram': {
      const nodes = [...(c.nodes ?? [])].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
      return (
        <ol className="vs-diagram">
          {nodes.map((n) => (
            <li key={n.id} className={`vs-node vs-node-${n.type}`}>
              <strong>{n.label}</strong>
              {n.description && <p>{n.description}</p>}
            </li>
          ))}
        </ol>
      );
    }
    case 'step_by_step':
      return (
        <ol className="vs-steps">
          {(c.steps ?? []).map((st) => (
            <li key={st.id}>
              <strong>{st.title}</strong>
              <p>{st.explanation}</p>
              {st.code && <pre className="vs-code"><code>{st.code.source}</code></pre>}
              {st.note && <small>{st.note}</small>}
            </li>
          ))}
        </ol>
      );
    case 'comparison':
      return (
        <div className="vs-table-wrap">
          <table className="vs-table">
            <thead>
              <tr>
                <th />
                {(c.subjects ?? []).map((s) => <th key={s.id}>{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {(c.criteria ?? []).map((cr) => (
                <tr key={cr.id}>
                  <th>{cr.label}</th>
                  {(c.subjects ?? []).map((s) => <td key={s.id}>{cr.values?.[s.id]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'example_grid':
      return (
        <div className="vs-grid">
          {(c.items ?? []).map((it) => (
            <div key={it.id} className="vs-card">
              <strong>{it.title}</strong>
              {it.description && <p>{it.description}</p>}
              {it.context && <small>{it.context}</small>}
            </div>
          ))}
        </div>
      );
    case 'real_world_example':
      return (
        <div className="vs-grid">
          {(c.examples ?? []).map((ex) => (
            <div key={ex.id} className="vs-card">
              <span className="vs-stage-label">{ex.concept}</span>
              <strong>{ex.title}</strong>
              <p>{ex.description}</p>
              <small>{ex.context}</small>
              {ex.externalResource && (
                <a href={ex.externalResource.url} target="_blank" rel="noreferrer noopener">{ex.externalResource.title}</a>
              )}
            </div>
          ))}
        </div>
      );
    case 'key_idea':
      return (
        <div className="vs-key-idea">
          <Lightbulb size={18} />
          <div>
            <strong>{c.statement}</strong>
            {c.supportingText && <p>{c.supportingText}</p>}
          </div>
        </div>
      );
    case 'key_takeaways':
      return (
        <ul className="vs-highlights">
          {(c.items ?? []).map((it) => (
            <li key={it.id}><Check size={14} /> <strong>{it.title}</strong>{it.description ? ` — ${it.description}` : ''}</li>
          ))}
        </ul>
      );
    case 'interactive_example':
      return <InteractiveExample content={c} />;
    case 'quick_check':
      return null;
    default:
      return <p className="vs-body">{c.body || c.statement || c.description || ''}</p>;
  }
}

function InteractiveExample({ content }) {
  const options = content.options ?? [];
  const [selected, setSelected] = useState(content.initialOptionId || options[0]?.id);
  const option = options.find((o) => o.id === selected);
  return (
    <div className="vs-interactive">
      <p>{content.prompt}</p>
      <div className="format-mode-toggle-group">
        {options.map((o) => (
          <button key={o.id} className={`format-pill-btn ${o.id === selected ? 'is-selected' : ''}`} onClick={() => setSelected(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      {option && (
        <div className="vs-card">
          <strong>{option.label}</strong>
          {option.detail && <p>{option.detail}</p>}
          {option.flow && (
            <div className="vs-flow">
              <Stage label="Problem" stage={option.flow.problem} />
              <ArrowRight className="vs-flow-arrow" size={18} />
              <Stage label="Solution" stage={option.flow.solution} />
              <ArrowRight className="vs-flow-arrow" size={18} />
              <Stage label="Result" stage={option.flow.result} />
            </div>
          )}
          {option.nextOptionIds?.length > 0 && (
            <div className="format-mode-toggle-group">
              {option.nextOptionIds.map((id) => (
                <button key={id} className="format-pill-btn" onClick={() => setSelected(id)}>
                  {options.find((o) => o.id === id)?.label} <ArrowRight size={12} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VisualSections({ sections }) {
  return (
    <div className="visual-sections">
      {sections
        .filter((s) => s.type !== 'quick_check' && s.type !== 'key_takeaways')
        .map((s) => (
          <section key={s.id ?? s.position} className={`vs-section vs-${s.type}`}>
            {s.title && <h3>{s.title}</h3>}
            <Section section={s} />
          </section>
        ))}
    </div>
  );
}
