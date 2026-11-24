import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Replaces the boot splash with a readable error card so a JavaScript failure
 * never leaves the visitor staring at a blank screen.
 */
function bootError(title: string, detail?: string) {
  const root = document.getElementById('root');
  if (!root) return;
  const card = document.createElement('div');
  card.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;' +
    'background:radial-gradient(circle at 50% 30%, #1b1030 0%, #0b0e17 70%);' +
    'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e2e8f0;text-align:center;';

  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:460px';
  const emoji = document.createElement('div');
  emoji.textContent = '🎮';
  emoji.style.cssText = 'font-size:38px';
  const h = document.createElement('h1');
  h.textContent = title;
  h.style.cssText = 'font-size:18px;font-weight:800;margin:10px 0 6px;color:#fff';
  const p = document.createElement('p');
  p.textContent = 'Refresh the page to try again. If it keeps happening, the details below help us fix it.';
  p.style.cssText = 'font-size:12px;line-height:1.6;color:#94a3b8;margin:0';
  inner.append(emoji, h, p);
  if (detail) {
    const code = document.createElement('pre');
    code.textContent = detail;
    code.style.cssText =
      'margin-top:14px;max-height:180px;overflow:auto;white-space:pre-wrap;text-align:left;' +
      'background:#111528;border:1px solid #2a2f45;border-radius:10px;padding:10px;font-size:10.5px;color:#f0abfc';
    inner.append(code);
  }
  const btn = document.createElement('button');
  btn.textContent = 'Reload Klik';
  btn.style.cssText =
    'margin-top:16px;padding:10px 20px;border:0;border-radius:10px;cursor:pointer;font-weight:800;font-size:12px;' +
    'color:#fff;background:linear-gradient(90deg,#8b5cf6,#ec4899)';
  btn.onclick = () => window.location.reload();
  inner.append(btn);

  card.append(inner);
  root.replaceChildren(card);
}

// Capture early runtime errors (also useful while the splash is still visible).
window.addEventListener('error', (e) => {
  const boot = document.getElementById('boot-fallback');
  if (boot) bootError('Something went wrong while starting Klik', `${e.message}\n${e.filename ?? ''}:${e.lineno ?? ''}`);
});
window.addEventListener('unhandledrejection', (e) => {
  const boot = document.getElementById('boot-fallback');
  if (boot) bootError('Something went wrong while starting Klik', String((e.reason as Error)?.message ?? e.reason));
});

// If the splash is still showing after 8s the bundle never executed.
window.setTimeout(() => {
  const boot = document.getElementById('boot-fallback');
  if (boot) {
    const label = document.getElementById('boot-label');
    if (label) label.textContent = 'Still loading — the game scripts may be blocked';
  }
}, 8000);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Klik crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-[#0b0e17] p-6 text-center">
          <div className="max-w-md">
            <div className="text-4xl">🎮</div>
            <h1 className="mt-3 font-display text-xl font-black text-white">Something went wrong</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Klik hit an unexpected error while starting up. Reloading usually fixes it.
            </p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/10 bg-[#111528] p-3 text-left text-[10.5px] text-fuchsia-300">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-xs font-black text-white"
            >
              Reload Klik
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
