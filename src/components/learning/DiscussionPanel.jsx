import React, { useState } from 'react';
import { MessagesSquare, Send } from 'lucide-react';
import { discussionsService } from '../../services/api';
import useAsync from '../../hooks/useAsync';
import { LoadingState } from '../shared/States';
import Avatar from '../shared/Avatar';

function Thread({ item }) {
  return (
    <li className="tk-thread">
      <Avatar name={item.author} size={34} />
      <div>
        <strong>{item.author}</strong> <small>{new Date(item.createdAt).toLocaleString()}</small>
        <p>{item.body}</p>
        {item.replies?.length > 0 && <ul className="tk-thread__replies">{item.replies.map((r) => <Thread key={r.id} item={r} />)}</ul>}
      </div>
    </li>
  );
}

/**
 * Questions, answers, comments and replies for a level. Uses the isolated discussions service;
 * the backend has no discussion API yet, so this shows that state instead of fake threads.
 */
export default function DiscussionPanel({ scope }) {
  const { data, loading } = useAsync(() => discussionsService.list(scope), [scope?.levelNumber]);
  const [draft, setDraft] = useState('');
  const available = data?.available;
  const items = data?.items ?? [];
  return (
    <div className="tk-discussion">
      {loading && <LoadingState label="Loading discussion…" />}
      {!loading && !available && (
        <div className="tk-discussion__off">
          <MessagesSquare size={30} />
          <strong>Level discussions are coming soon</strong>
          <p>Ask questions, share answers and reply to other learners here once community discussions launch.</p>
        </div>
      )}
      {available && items.length === 0 && <p className="tk-state">No questions yet. Start the conversation!</p>}
      {available && <ul className="tk-threads">{items.map((t) => <Thread key={t.id} item={t} />)}</ul>}
      <form className="tk-composer" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="tk-discuss" className="tk-sr-only">Ask a question</label>
        <input id="tk-discuss" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={available ? 'Ask a question or share a tip…' : 'Discussions are not available yet'} disabled={!available} />
        <button className="tk-btn tk-btn--primary tk-btn--sm" disabled={!available || !draft.trim()} aria-label="Post"><Send size={16} /></button>
      </form>
    </div>
  );
}
