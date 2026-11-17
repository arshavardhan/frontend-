import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api, errorMessage } from '../lib/api';

export default function LabTerminal({ sessionId }) {
  const host = useRef(null);
  const term = useRef(null);
  const socket = useRef(null);
  const fit = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = new Terminal({ fontSize: 13, convertEol: false, cursorBlink: true, theme: { background: '#0b1220' } });
    const f = new FitAddon();
    t.loadAddon(f);
    t.open(host.current);
    f.fit();
    term.current = t;
    fit.current = f;
    const input = t.onData((data) => {
      if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'input', data }));
    });
    const onResize = () => {
      f.fit();
      if (socket.current?.readyState === WebSocket.OPEN)
        socket.current.send(JSON.stringify({ type: 'resize', cols: t.cols, rows: t.rows }));
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      input.dispose();
      t.dispose();
    };
  }, []);

  useEffect(() => {
    let closed = false;
    let ws;
    (async () => {
      setStatus('connecting');
      try {
        const { url } = await api.post('stage2/labs/terminal-token', { sessionId });
        if (closed) return;
        const t = term.current;
        const address = new URL(url);
        address.searchParams.set('cols', t.cols);
        address.searchParams.set('rows', t.rows);
        ws = new WebSocket(address);
        socket.current = ws;
        ws.onmessage = (event) => {
          if (closed) return;
          const m = JSON.parse(event.data);
          if (m.type === 'ready') {
            setStatus('connected');
            t.reset();
            if (m.scrollback) t.write(m.scrollback);
            t.focus();
          }
          if (m.type === 'output') t.write(m.data);
          if (m.type === 'exit' || m.type === 'closed') setStatus(m.reason ? `closed (${m.reason})` : 'shell exited');
        };
        ws.onclose = () => !closed && setStatus((s) => (s === 'connecting' || s === 'connected' ? 'disconnected' : s));
        ws.onerror = () => !closed && setStatus('could not connect');
      } catch (e) {
        if (!closed) setStatus(errorMessage(e));
      }
    })();
    return () => {
      closed = true;
      if (socket.current === ws) socket.current = null;
      ws?.close();
    };
  }, [sessionId, attempt]);

  return (
    <div className="lab-terminal">
      <div className="lab-terminal-bar">
        <span className={`lab-dot ${status === 'connected' ? 'is-on' : ''}`} /> Terminal · {status}
        {status !== 'connected' && status !== 'connecting' && (
          <button className="inline-link-btn" onClick={() => setAttempt((n) => n + 1)}>Reconnect</button>
        )}
        <button
          className="inline-link-btn"
          onClick={() => socket.current?.readyState === WebSocket.OPEN && socket.current.send(JSON.stringify({ type: 'interrupt' }))}
        >
          Ctrl+C
        </button>
      </div>
      <div className="lab-terminal-host" ref={host} />
    </div>
  );
}
