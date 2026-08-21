import { getAuthHeader } from '../api.js';

// Fetch-based SSE client — deliberately not the browser `EventSource` API,
// since EventSource cannot carry the app's Authorization header (Supabase
// JWT, falling back to the legacy X-Nexus-Token only for pre-Supabase
// sessions) and every other request in this app goes through getAuthHeader().
//
// Extracted from Chat.jsx's original inline `openReasoningStream` (unchanged
// behavior) so onboarding's job-progress stream can use the identical
// mechanism instead of duplicating it.
//
// `path` is relative to the API base, e.g. `/chat/runs/{runKey}/stream` or
// `/onboarding/analyze/{jobId}/stream`. Calls `onEvent` for each parsed
// `data:` line; returns a cancel function.
export function openEventStream(path, onEvent) {
  const BASE = import.meta.env.VITE_API_BASE ?? '';
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(`${BASE}/api/v1${path}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok || !res.body) return;
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try { onEvent(JSON.parse(line.slice(5).trim())); } catch {}
        }
      }
      reader.cancel().catch(() => {});
    } catch {}
  })();

  return () => { cancelled = true; };
}
