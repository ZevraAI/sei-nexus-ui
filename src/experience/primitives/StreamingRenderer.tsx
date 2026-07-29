/** Zevra Experience Layer — StreamingRenderer (primitive, Phase 3.7).
 *  Renders an AsyncIterable<string> as it arrives — the ONE streaming mechanism (reused by Command
 *  and any future streaming surface). It presents content, not motion (no WAAPI/rAF); pacing comes
 *  from the stream. Cancels cleanly on unmount / stream change (leak-free). */
import { useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';

export interface StreamingRendererProps extends HTMLAttributes<HTMLSpanElement> {
  stream: AsyncIterable<string>;
  onDone?: () => void;
}

export function StreamingRenderer({ stream, onDone, className, ...rest }: StreamingRendererProps) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setText('');
    setDone(false);
    (async () => {
      try {
        for await (const chunk of stream) {
          if (cancelled) return;
          setText((t) => t + chunk);
        }
      } finally {
        if (!cancelled) { setDone(true); onDone?.(); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  return (
    <span className={className} aria-live="polite" {...rest}>
      {text}
      {!done && <span aria-hidden className="text-z-text-3">▍</span>}
    </span>
  );
}
