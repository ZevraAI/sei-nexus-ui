# How Zevra Works: the interactive architecture guide

The standard, customer-facing explanation of how Zevra is built: company setup, discovering data,
asking a question, agents, and self-learning, with every AI call, every data store and every safety
check shown. It is used in customer demos and as the team's shared picture of the architecture.

**Open it:**
- In Zevra: sign in as a **Zevra platform admin** (ADMIN in the platform workspace) and choose **Admin > How Zevra works** (`#/guide`). It is embedded straight from `built/`, so there is no second copy: rebuild the guide, then the next UI build includes it.
- As a file: `built/how-zevra-works.html` (one self-contained file; works offline except for web fonts).

> **This guide is part of the definition of done.** Any change to the architecture or any new
> functionality must update it in the same change. See "When you must update it" below.

## Where this lives, and one hard rule

It lives in the **private** `sei-nexus-ui` repository, not in `zevra-docs`. `zevra-docs` deploys to the
public site on every merge, and this guide deliberately includes a candid "Known limits" section. **Never
publish it on the public docs site** or anywhere without an access list.

In the app it is shown only to platform admins. That is a screen-level gate: the guide ships as a lazy-loaded file in the UI
bundle, so it is not secret from someone who inspects the app's static files. If it must be truly access-controlled, serve it
from the backend behind the admin role instead.

## Layout

| Path | What it is |
|---|---|
| `src/head.html` | Title, fonts and all CSS (design tokens at the top) |
| `src/body.html` | The page skeleton and fixed prose: tabs, intros, flow scenarios, headings |
| `src/data1.js` | `ZG.meta` (review date), the five places, the **AI-use table**, **Flow 1** (company setup), **Flow 2** (discovering data) |
| `src/data2.js` | **Flow 3** (asking a question): the 17 steps and the five worked examples with their real SQL, verdicts and call counts |
| `src/data3.js` | **Flow 4** (agents) and the agent simulator, background features, **Flow 5** (learning), the **data-boundary scenarios**, the **storage table**, the **safety checks**, **known limits**, the **FAQ** |
| `src/engine.js` | Rendering and interactions: lane diagram, step player, example picker, simulators. Rarely needs changing for content |
| `tools/build.py` | Builds `src/` into `built/` (standalone page + the variant for republishing as an Artifact) |
| `tools/verify_facts.py` | Compares the numbers and names in the guide with the real code. Fails when they drift |
| `tools/smoke.js` | Loads the built page in a simulated browser and clicks everything. Fails on script errors or empty sections |
| `built/` | The generated pages. **Commit them** so the demo file is always ready |

## When you must update it

If your change does any of the following, change the guide in the same pull request:

| Your change | Update |
|---|---|
| Adds, removes or alters an **AI call** (new prompt, different inputs, different model default) | A row in `aiUses` (`data1.js`); the step and its `ai` card in the right flow; `ROLE` in `tools/verify_facts.py` for a new row |
| Changes **what is sent to OpenAI** (more or less data, different summarising) | The step's `moves` and `never`; the matching `ZG.bnd` scenario and `ZG.store` row (`data3.js`); a new known limit if it widens exposure |
| Changes a **step in a flow** (order, a new check, a removed stage, a new tool) | The flow's `steps` array; for questions, also the five `examples` (skips, overrides, ledger) |
| Changes **safety rules or limits** (row limits, timeouts, allowed SQL, masking, RLS, contracts) | `ZG.guards`, the chat step "checks the query", and `ZG.limits` |
| Changes **where data lives** (new table, vector store, document storage, secrets handling) | `ZG.store`, `ZG.places`, and the flow steps that read or write it |
| Changes **agents, tools or background jobs** (reports, baselines, alerts, brief, automations) | Flow 4 steps, `ZG.agentRun`, `ZG.bg` |
| Changes **learning** (signals, confidence steps, thresholds, promotion) | Flow 5 steps and the simulator in `engine.js` (`learnSim`); `verify_facts.py` will tell you which numbers moved |
| Adds, closes or discovers a **limitation** | `ZG.limits` (and the matching FAQ answer). Closing a limit means removing it, not softening it |
| Changes a **model default** in `application.yml` | Run `verify_facts.py`: it names every row to fix |

A new customer-visible capability that fits none of the above still gets a mention: a new flow step, a new
row in the AI table, or a new FAQ answer.

## How to update

1. Edit the files in `src/`. Content is plain JavaScript objects (see an existing step as the template).
2. Set `ZG.meta.reviewed` in `src/data1.js` to today's date once you have re-checked the guide against the code.
3. Build and check, from this folder:

```
python tools/build.py
SANDBOX=1 node tools/smoke.js       # (after npm install in tools/) also proves it works inside the app's sandboxed iframe
python tools/verify_facts.py        # needs the backend repo as a sibling checkout (../../../sei-nexus-ai), or set ZEVRA_BACKEND
cd tools && npm install && node smoke.js
```

4. Open `built/how-zevra-works.html`, look at the tabs you changed (phone width too).
5. Commit `src/` **and** `built/` together.
6. Optional: republish the Artifact copy from `built/how-zevra-works.artifact.html`
   (the existing Artifact URL is `https://claude.ai/artifact/RCZ8YyXQ7fYT96F3KFE868`; pass it as the
   URL when republishing so the link does not change). The Artifact is private.

## Accuracy rules (why customers can trust it)

- **Every factual claim comes from the code**, not from memory or intent. Open the class and read it.
- **Label anything illustrative** ("Illustrative", "abridged") and keep real figures real. The chat examples
  use real SQL, verdicts and call counts from an actual run; if you replace one, replace it with a real run.
- **No absolutes the code does not enforce.** Write "only checked SELECT queries are sent", not "Zevra can never write".
- **Say what the AI can and cannot do** on every AI step: model, what it sees, what it decides, what it cannot do.
- **Keep the limitations honest.** The "Known limits" section is a feature. Add to it; do not water it down.
- **Plain English.** The reader has no code knowledge. Explain the idea first, name the mechanism second.
- `verify_facts.py` only checks numbers and names it knows about. It cannot notice a new feature or a changed
  flow. That part is a human review, which is why this is a rule and not just a script.
