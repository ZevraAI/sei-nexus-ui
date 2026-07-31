/** Suggested Questions — a lightweight, clickable chip row on Home. Clicking a chip
 *  launches a new investigation through the shell composer's prefill mechanism, so it
 *  stays consistent with the single launch experience. Self-hides when there are none.
 *  Home stays an executive briefing; this is a small starter affordance, not a launcher. */
import { useEffect, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — App/api are untyped JS modules
import { navigate } from '../../../App.jsx';
// @ts-ignore
import { api } from '../../../api.js';
import { Eyebrow } from '../../../ds/intelligence';

export function SuggestedQuestions() {
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    api.onboarding.status()
      .then((s: any) => { if (alive && s?.suggested_questions?.length) setQuestions(s.suggested_questions.slice(0, 5)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!questions.length) return null;

  const launch = (q: string) => {
    localStorage.setItem('zevra_chat_prefill', q); // same prefill the shell composer uses
    navigate('/chat');
  };

  return (
    <section aria-label="Suggested questions" className="mt-8">
      <Eyebrow className="mb-2">Suggested questions</Eyebrow>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => launch(q)}
            className="rounded-z-pill border border-z-border bg-z-card px-3.5 py-2 text-z-caption text-z-text-2 transition-colors hover:border-z-primary hover:text-z-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-z-focus-ring"
          >
            {q}
          </button>
        ))}
      </div>
    </section>
  );
}
