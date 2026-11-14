import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { isPlatformAdmin } from '../lib/platformAdmin.js';

// "How Zevra Works": the interactive architecture guide. Its single source lives in
// docs/how-zevra-works (edit src/, run tools/build.py); this page imports the BUILT file as text, lazily,
// so it adds nothing to the main bundle and there is no second copy to keep in step.
const loadGuide = () =>
  import('../../docs/how-zevra-works/built/how-zevra-works.html?raw').then(m => m.default);

export default function Guide({ user }) {
  const { isDark } = useTheme();
  const allowed = isPlatformAdmin(user);
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!allowed) return undefined;
    let live = true;
    loadGuide()
      .then(h => { if (live) setHtml(h); })
      .catch(e => { if (live) setError(e?.message || 'Could not load the guide'); });
    return () => { live = false; };
  }, [allowed]);

  // The guide follows the app's theme (it still has its own toggle inside).
  const doc = useMemo(
    () => (html ? html.replace('<html lang="en">', `<html lang="en" data-theme="${isDark ? 'dark' : 'light'}">`) : null),
    [html, isDark]);

  const openInTab = () => {
    if (!doc) return;
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
  };

  const muted = isDark ? 'text-[#94A3B8]' : 'text-z-text-3';

  if (!allowed) {
    return (
      <div className="max-w-[640px] mx-auto px-6 py-16 text-center" data-testid="guide-denied">
        <ShieldAlert size={28} className={`mx-auto mb-3 ${muted}`} />
        <h1 className={`text-z-body-lg font-semibold mb-1 ${isDark ? 'text-[#E2E8F0]' : 'text-z-text'}`}>
          Only Zevra administrators can open this guide
        </h1>
        <p className={`text-z-caption ${muted}`}>It is an internal walkthrough of how Zevra is built, including its known limits.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className={`text-z-lead font-semibold ${isDark ? 'text-[#E2E8F0]' : 'text-z-text'}`}>How Zevra works</h1>
          <p className={`text-z-small ${muted}`}>Interactive architecture guide, for Zevra administrators.</p>
        </div>
        <button type="button" onClick={openInTab} disabled={!doc}
          className={`inline-flex items-center gap-1.5 text-z-small font-medium px-3 py-1.5 rounded-lg border disabled:opacity-50
                      ${isDark ? 'border-[#252E3F] text-[#E2E8F0] hover:bg-[#1A1F2B]' : 'border-z-border text-z-text-2 hover:bg-z-card-2'}`}>
          <ExternalLink size={13} /> Open full screen
        </button>
      </div>
      {error && <p className="text-z-caption text-red-600">{error}</p>}
      {!doc && !error && <p className={`text-z-caption ${muted}`}>Loading the guide…</p>}
      {doc && (
        <iframe
          title="How Zevra works"
          srcDoc={doc}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className={`w-full rounded-xl border ${isDark ? 'border-[#252E3F]' : 'border-z-border'}`}
          style={{ height: 'calc(100vh - 170px)', minHeight: 520 }}
        />
      )}
    </div>
  );
}
