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

  const muted = isDark ? 'text-[#94A3B8]' : 'text-gray-500';

  if (!allowed) {
    return (
      <div className="max-w-[640px] mx-auto px-6 py-16 text-center" data-testid="guide-denied">
        <ShieldAlert size={28} className={`mx-auto mb-3 ${muted}`} />
        <h1 className={`text-[18px] font-semibold mb-1 ${isDark ? 'text-[#E2E8F0]' : 'text-gray-900'}`}>
          Only Zevra administrators can open this guide
        </h1>
        <p className={`text-[13px] ${muted}`}>It is an internal walkthrough of how Zevra is built, including its known limits.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className={`text-[17px] font-semibold ${isDark ? 'text-[#E2E8F0]' : 'text-gray-900'}`}>How Zevra works</h1>
          <p className={`text-[12px] ${muted}`}>Interactive architecture guide, for Zevra administrators.</p>
        </div>
        <button type="button" onClick={openInTab} disabled={!doc}
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border disabled:opacity-50
                      ${isDark ? 'border-[#252E3F] text-[#E2E8F0] hover:bg-[#1A1F2B]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          <ExternalLink size={13} /> Open full screen
        </button>
      </div>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {!doc && !error && <p className={`text-[13px] ${muted}`}>Loading the guide…</p>}
      {doc && (
        <iframe
          title="How Zevra works"
          srcDoc={doc}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className={`w-full rounded-xl border ${isDark ? 'border-[#252E3F]' : 'border-gray-200'}`}
          style={{ height: 'calc(100vh - 170px)', minHeight: 520 }}
        />
      )}
    </div>
  );
}
