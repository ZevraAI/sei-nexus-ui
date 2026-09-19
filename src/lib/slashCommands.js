/**
 * Global slash-command registry — the single source of truth for every "/" command
 * surfaced by the shared slash-command launcher (see SlashCommandMenu.jsx), wired into
 * every InvestigationComposer instance: the Home Search / shell composer (Layout.jsx),
 * the landing composer, and the Full Chat follow-up composer (both in Chat.jsx).
 *
 * Two command shapes:
 *  - action: 'modal'  — intercepted client-side, never sent as a chat question. The
 *    composer calls `onSlashCommand(cmd)` and clears its own input; the consumer decides
 *    what "launch" means for its surface (Chat.jsx opens TeachZevraModal directly; the
 *    shell composer hands off via the existing cross-page prefill + navigate('/chat'),
 *    where Chat.jsx's own interception takes over — see Layout.jsx/Chat.jsx wiring).
 *  - action: 'insert' — existing ChatService-handled commands (/knowledge, /request-source)
 *    that take free-text arguments. The launcher only helps discovery/autocomplete: picking
 *    one inserts "<command> " into the composer and leaves focus there for the user to type
 *    the argument; the text is still sent through the normal question path, unchanged.
 */
export const SLASH_COMMANDS = [
  {
    id: 'teach-zevra',
    command: '/TeachZevra',
    label: 'Teach Zevra',
    description: 'Explicitly teach a business term, definition, and scope',
    action: 'modal',
  },
  {
    id: 'knowledge',
    command: '/knowledge',
    label: 'Propose knowledge',
    description: 'Propose adding knowledge Zevra doesn’t have yet',
    action: 'insert',
  },
  {
    id: 'request-source',
    command: '/request-source',
    label: 'Request a data source',
    description: 'Request a new data source or workflow integration',
    action: 'insert',
  },
];

/** Still-composing-the-command-token detector: "/" then no whitespace yet. */
const SLASH_TOKEN = /^\/(\S*)$/;

/** Returns the in-progress command query (text after "/", lowercased) or null if the
 *  current composer value isn't in "still typing a slash command" position. */
export function slashQueryFor(value) {
  const match = SLASH_TOKEN.exec(value || '');
  return match ? match[1].toLowerCase() : null;
}

/** Commands whose name starts with `query` (case-insensitive); empty query -> all. */
export function matchSlashCommands(query) {
  if (query == null) return [];
  const q = query.toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.command.slice(1).toLowerCase().startsWith(q));
}
