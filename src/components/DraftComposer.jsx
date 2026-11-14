import { useState } from 'react';
import InvestigationComposer from './InvestigationComposer.jsx';

/**
 * DraftComposer — InvestigationComposer that owns its own draft text.
 *
 * Why it exists: when the draft lived in the Chat page's state, every keystroke re-rendered the
 * whole workspace (message list, evidence rail, tables). Here a keystroke re-renders only this
 * component. The parent receives the text once, on submit: `onSubmit(text)`. To reset the draft
 * from outside (e.g. "new investigation"), change the `key`.
 *
 * `canSubmitEmpty` lets the send button work with no text (e.g. when a file is attached).
 */
export default function DraftComposer({ onSubmit, busy = false, canSubmitEmpty = false, ...rest }) {
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim() && !canSubmitEmpty) return;
    const sent = text;
    setText('');
    onSubmit?.(sent);
  };

  return (
    <InvestigationComposer
      {...rest}
      value={text}
      onChange={setText}
      onSubmit={submit}
      disabled={busy || (!text.trim() && !canSubmitEmpty)}
    />
  );
}
