(function(ZG){

/* =========================== FLOW 4: AGENTS =========================== */
ZG.flows.f4 = {id:'f4', steps:[
 {id:'s1',t:'A request reaches an agent',from:'A',to:'B',tags:['rule','ai:gpt-4o-mini'],
  what:`<p>There are three ways work reaches an agent:</p><ul><li><strong>From chat:</strong> the question is classified as an open-ended job, and a second small AI call picks the best agent (see flow 3, step 2). Below 0.65 confidence it falls back to ordinary chat.</li><li><strong>Directly:</strong> a person opens an agent and talks to it.</li><li><strong>On a schedule:</strong> the daily executive brief runs each selected agent on its own (see "Work that happens without anyone asking" below).</li></ul>`,
  ex:{label:'An agent is just a saved description',body:`name:            Procurement Watch   (illustrative)
persona:         A careful procurement analyst
goal:            Find supplier and order risks
databases:       retail_core
step limit:      8`},
  moves:[{d:'out',t:'From chat only: the question text for the routing calls, and for the agent-picking call each agent\'s name, goal and the names of the tables registered for its databases'}],
  never:[`An agent can use only the databases listed on it`],
  why:`Open-ended jobs need a different method from a one-shot question, and the routing step keeps simple questions on the simple, cheaper path.`},
 {id:'s2',t:'Zevra works out what the agent may touch',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Before the agent thinks at all, Zevra resolves the request against the agent's databases and the company's business objects and builds the <strong>contract</strong>: the list of tables and columns this run is allowed to use.</p><p>The agent's instructions are grounded in those business objects only (names, meaning, columns, allowed values). The agent is not handed the raw database catalogue.</p>`,
  moves:[{d:'stay',t:'Business objects and their meanings are read from Zevra\'s database'}],
  never:[`The agent cannot discover or query a table outside the contract`],
  why:`The boundary is set by Zevra's rules before any AI is involved. The agent works inside it.`},
 {id:'s3',t:'Zevra gives the agent its toolbox',from:'B',to:'B',tags:['rule'],
  what:`<p>The agent can only act through a short list of tools, each doing one thing and each run by Zevra, never by the AI itself:</p><ul><li><code>describe_schema</code>: see an approved table's columns</li><li><code>query_database</code>: run a read-only SELECT</li><li><code>list_business_objects</code>, <code>get_business_object</code>, <code>explore_related</code>: browse the approved business world and how things connect</li><li><code>analyze_image</code>: describe an attached image</li><li><code>memory_list</code>, <code>memory_get</code>, <code>memory_get_execution_reference</code>: recall earlier results in the conversation</li><li><code>final_answer</code>: finish with the answer</li></ul>`,
  never:[`There is no tool that writes, deletes or changes anything`],
  why:`Giving the AI a short menu of safe actions, rather than free access, is what makes an autonomous agent safe to run.`},
 {id:'s3p',t:'Zevra shows the agent its playbooks',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>A <strong>playbook</strong> is a named, approved way of investigating one kind of question, written by your team and attached to an agent. It has four parts: <em>use when</em> (the kind of question it covers), <em>steps</em> (in order), an optional <em>evidence order</em> (what to look at first) and optional <em>escalate / flag when</em> rules.</p><p>Zevra reads the agent's active playbooks from its own database and places all of them in the agent's instructions. <strong>The AI decides whether one applies</strong> to this request: if so it follows the steps in order (it may add steps the data requires) and names the playbook in its answer; if none matches it ignores them all. Zevra does not match keywords itself.</p>`,
  ex:{label:'A playbook (illustrative)',body:`name:        Stock-out triage
use when:    someone reports a product is out of stock
steps:       1. Find the product and its location.
             2. Compare available stock with the reorder point.
             3. Check open purchase orders and their due dates.
             4. Say whether a replenishment is already on the way.
evidence:    inventory first, then purchase orders
escalate:    stock is zero at every location`},
  moves:[{d:'stay',t:'Playbooks are read from, and saved in, the company\'s room in Zevra\'s database'},{d:'out',t:'The playbooks\' text goes to OpenAI inside the agent\'s instructions on each step of the loop (it is your own written guidance, not your data)'}],
  never:[`A playbook cannot widen what the agent may touch: the contract, the read-only tools and the query checks always win`,`There is no AI call just for playbooks: the agent's normal loop reads them`],
  why:`Your best analysts have a method. A playbook lets you write it down once so every run of the agent starts from it, while the model still judges whether it fits the question.`},
 {id:'s4',t:'The agent decides what to do next',from:'B',to:'E',tags:['ai:gpt-4o'],
  what:`<p>This is the heart of an agent: a loop. Each time round, one AI call reads the task and decides either to call a tool or to give the final answer. It is shown its instructions, the task, and the <strong>last six tool exchanges</strong> only. Older steps are dropped to keep each call small.</p><p>The loop repeats until the agent calls <code>final_answer</code> or reaches its step limit.</p>`,
  ai:{model:'gpt-4o',sees:'The agent\'s persona and goal, its playbooks, the approved business objects, the task, and the last six tool calls and their results (including the rows returned: see step 5).',decides:'Which tool to call next with which arguments, or the final answer.',cant:'Run anything itself, reach a table outside the contract, or take more steps than its limit.'},
  moves:[{d:'out',t:'Persona, goal, playbooks, approved business objects, the task, the last six tool results'},{d:'no',t:'Database passwords, tables outside the contract'}],
  never:[`An identical repeated tool call is answered from a cache and the agent is told so, which breaks accidental loops`],
  why:`Letting the model choose the next look-up is what allows open-ended investigation, and the toolbox and contract bound what it can do.`},
 {id:'s5',t:'Zevra carries out the tool, and the result goes back',from:'B',to:'D',tags:['rule','src'],
  what:`<p>When the agent asks to run a query, Zevra uses the <strong>same checks as chat</strong> (SELECT only, approved tables, joins, row limits, masking, row-level security, audit) plus two agent-specific rules: the contract gate is always on, and the database session is marked <strong>read-only</strong>.</p><p>If a check fails, the agent gets a plain explanation as its next observation and can correct itself. Otherwise the query runs, and the rows returned (up to the row limit, 100 for a typical list) are handed to the agent as the tool result. Then the loop returns to step 4.</p>`,
  ex:{label:'A rejected query is not an error to the user',body:`error: Query references table(s) not in the approved execution contract.
Approved physical tables: [retail_core.suppliers, retail_core.purchase_orders]
Use an approved business object, or state via final_answer that the data
is not available.`},
  moves:[{d:'in',t:'Query results come from your database'},{d:'out',t:'The rows returned (up to the row limit) go to the agent\'s next AI call. Unlike chat, an agent sees the rows, not just a summary'}],
  never:[`The database session is read-only for agents`,`A table outside the contract is rejected before it reaches your database`],
  why:`Agents need the real rows to reason about them, so the limit on how many rows a query may return is the control. That limit is enforced by Zevra, not left to the AI.`},
 {id:'s6',t:'The agent finishes, or is stopped',from:'B',to:'A',tags:['rule'],
  what:`<p>The agent ends by calling <code>final_answer</code>. If it reaches its step limit first, Zevra makes one last AI call with <strong>no tools allowed</strong>, asking for the best answer from what has been gathered. If even that fails, the person is told plainly that it could not finish within the allowed steps.</p>`,
  never:[`An agent can never run indefinitely`],
  why:`A hard limit, with a graceful last answer, means an agent costs a bounded amount and always responds.`},
 {id:'s7',t:'Everything the agent did is recorded',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Zevra saves the whole session: every thought step, tool call and result, how long each took, and the final answer. Queries are audited as in chat. A data-backed investigation is also recorded as a <em>finding</em> so the home page can surface what the agent discovered.</p>`,
  moves:[{d:'stay',t:'Session steps, results and findings are saved in the company\'s room in Zevra\'s database'}],
  never:[`Nothing the agent did is hidden: the full step log can be reviewed`],
  why:`An autonomous system must be inspectable after the fact.`}
]};

ZG.agentRun = {
 task:'Which suppliers are putting us at risk, and why?', max:8,
 rules:[`Only the databases listed on the agent`,`Only the business objects approved for this request`,`A read-only database session`,`The same query checks as chat: SELECT only, row limits, masking, row-level security, audit`,`A step limit (8 here). At the limit it must answer from what it has`,`An identical repeated call is answered from a cache`],
 steps:[
  {t:'ai',x:`I should see which business objects I am allowed to use before I query anything.`},
  {t:'tool',tool:'list_business_objects',x:`Asks Zevra for the approved business objects.`},
  {t:'obs',x:`Suppliers, Purchase Orders, Purchase Order Lines, Goods Receipts, Shipments, Warehouses ... (only approved objects are listed).`},
  {t:'ai',x:`Suppliers carry delivery and quality ratings. I'll look for the weakest on-time delivery.`},
  {t:'tool',tool:'query_database',x:`Asks Zevra to run a query.`,sql:`SELECT name, tier, status, quality_rating, on_time_delivery_pct
FROM retail_core.suppliers
WHERE on_time_delivery_pct < 90
ORDER BY on_time_delivery_pct
LIMIT 20`,note:'Zevra checked: SELECT only · approved table · row limit applied · read-only session · audited.'},
  {t:'obs',x:`11 rows. Lowest: <strong>Continental Footwear Corp</strong>, 71.3% on time, quality 2.1, status under review.`},
  {t:'ai',x:`The weakest supplier matters more if it has orders open right now. Let me check.`},
  {t:'tool',tool:'query_database',x:`Asks Zevra to run a second query.`,sql:`SELECT po.po_number, po.status, po.expected_delivery_date
FROM retail_core.purchase_orders po
JOIN retail_core.suppliers s ON s.id = po.supplier_id
WHERE s.name = 'Continental Footwear Corp'
  AND po.status IN ('submitted','acknowledged','partially_received')`,note:'Checked again: both tables are inside the approved contract.'},
  {t:'obs',x:`3 rows: PO-2025-00234, PO-2025-00267, PO-2025-00298, all partially received.`},
  {t:'fin',tool:'final_answer',x:`Continental Footwear Corp is the biggest risk: 71.3% on-time delivery, a quality rating of 2.1, under review, and three open purchase orders only partly received. Ten other suppliers are also below 90% on time.`}
 ]};

ZG.bg = [
 {name:'Scheduled reports',what:`A saved question that Zevra asks again on a schedule and emails to people.`,tags:['ai:same as chat','zdb'],
  how:[`Every minute, Zevra checks every company for reports that are due.`,`A due report runs its question through the normal chat pipeline as the report's owner. The same checks, masking and row-level security apply to that person.`,`The result is formatted as an email or a Slack message by Zevra's report formatter, if mail or Slack is configured.`],
  ai:[`The same AI calls as a chat question (flow 3). The email and Slack formatting is plain code, with no AI.`,`Nothing runs without a person having created the report first.`]},
 {name:'Baselines and anomaly detection',what:`Watches a single number over time and flags unusual moves, for example daily open purchase orders.`,tags:['rule','src'],
  how:[`A baseline is a measuring query plus how often to measure. The query is safety-checked when it is created.`,`Every hour, due baselines are measured again and the history is kept.`,`Zevra computes the average and spread of the history. A value is flagged if it is more than 1.5 standard deviations away, or more than 20% off the average.`,`Severity: above 1.5 medium, above 2 high, above 3 critical.`],
  ai:[`<strong>No AI.</strong> This is arithmetic on the numbers your database returns.`]},
 {name:'Alerts',what:`Tells people when an anomaly appears.`,tags:['ai:gpt-4.1','rule'],
  how:[`When a baseline raises an anomaly, Zevra finds the enabled alert rules for it.`,`Each rule has a severity threshold and a cooldown, so people are not spammed.`,`Messages go to the in-app inbox, Slack, email, or all of them, as the rule says.`],
  ai:[`One AI call writes the wording of the message. It sees the rule, the metric and how far it deviated, not rows of data.`,`Whether an alert fires is decided by the rule and the numbers, not by AI.`]},
 {name:'Morning brief',what:`A daily summary for executives, built by the company's agents.`,tags:['ai:gpt-4o','rule'],
  how:[`Every minute, Zevra checks each company's brief schedule. Once per day, after the configured time in the company's own timezone, it generates the brief.`,`It runs each selected active agent (capped at 5 steps each) with a question built from that agent's goal.`,`Their findings are combined into one brief.`],
  ai:[`Each agent uses the agent loop (flow 4), so it sees the rows its queries return, up to the row limit.`,`One more AI step combines the findings into the final brief.`]},
 {name:'Automations',what:`Visual workflows: a chain of steps that run in order, with branches.`,tags:['ai:gpt-4o','rule'],
  how:[`A workflow is a graph of steps: trigger, database query, AI reasoning, condition (which branches), transform, image analysis, response.`,`Zevra runs the steps in order and records what each one did.`,`A person can describe the automation in plain English and have an AI draft the workflow, then review and edit it.`],
  ai:[`AI is used only in AI steps (and to draft a workflow when asked). Drafting sees your written requirement and the registered table and column names of the databases you pick, never rows of data.`,`Conditions, transforms and queries are plain rules.`]}
];

/* =========================== FLOW 5: LEARNING =========================== */
ZG.flows.f5 = {id:'f5', steps:[
 {id:'s1',t:'A question succeeds right after a clarification',from:'B',to:'E',tags:['ai:gpt-4o-mini'],cond:'only after Zevra asked a question back',
  what:`<p>Zevra asked a clarifying question, the person answered, and the next query worked. That is a strong signal that the person just taught Zevra what a word means. An AI call looks at the question and the SQL that answered it and extracts up to three <em>business term &rarr; SQL rule</em> pairs.</p><p>Each becomes a <strong>learned term</strong> with confidence 0.50 and 1 use. If exactly one business concept was in play, the term is tied to it. Otherwise it has no concept for now.</p>`,
  ex:{label:'Example',body:`Question: "Show me overdue purchase orders"  (after clarifying)
Learned : "overdue" -> expected_delivery_date < CURRENT_DATE
                       AND actual_delivery_date IS NULL
          confidence 0.50, used 1 time`},
  ai:{model:'gpt-4o-mini',sees:'The question and the SQL that answered it.',decides:'Up to three business terms and the SQL fragment each stands for.',cant:'Save anything beyond a low-confidence candidate, or promote it.'},
  moves:[{d:'out',t:'The question and its SQL'},{d:'stay',t:'The learned term is stored in the company\'s room'}],
  never:[`A normal successful question teaches nothing`,`It is not promoted immediately`],
  why:`Learning only from this clear moment avoids absorbing guesses from every query.`},
 {id:'s2',t:'A confirmed "this word means this value" is remembered',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>When a person's shorthand (for example "TX") was matched to a real allowed value (<code>state_province = 'Texas'</code>) and the query ran, Zevra stores that pairing as a learned term. It is only stored if the value was checked against the column's known allowed values. It starts at 0.50.</p>`,
  ex:{label:'Example',body:`"tx" -> state_province = 'Texas'     (validated against the allowed values)`},
  moves:[{d:'stay',t:'Stored in the company\'s room'}],
  never:[`No AI call in this step`,`Never promoted directly`],
  why:`A value that is checked against real allowed values is much safer to remember than a free-form guess.`},
 {id:'s3',t:'A correction lowers trust',from:'B',to:'E',tags:['ai:gpt-4o'],
  what:`<p>On follow-up questions, an AI call checks whether the person is <em>correcting</em> the previous answer ("no, I meant orders not yet delivered"). If so, Zevra records the correction (used for the rest of that conversation) and lowers the confidence of the related learned term by <strong>0.20</strong>.</p>`,
  ai:{model:'gpt-4o',sees:'The new question, the previous question and the previous answer.',decides:'Whether this is a correction, and what was misunderstood.',cant:'Change any data or promote or delete a term by itself.'},
  moves:[{d:'out',t:'The new question and the previous question and answer'},{d:'stay',t:'The correction is stored in the company\'s room'}],
  never:[`One correction cannot delete a term: it only lowers confidence`],
  why:`People correct what they notice is wrong, so a correction is valuable feedback, but one voice should not erase a term.`},
 {id:'s4',t:'A thumbs-up raises trust',from:'A',to:'B',tags:['human','rule'],
  what:`<p>When a person gives an answer a thumbs-up, any learned terms tied to that run's SQL gain <strong>+0.08</strong> confidence and one more use.</p>`,
  moves:[{d:'stay',t:'The feedback is stored in the company\'s room'}],
  never:[`No AI call in this step`],
  why:`Explicit approval is the clearest evidence that a definition worked.`},
 {id:'s5',t:'Using a term again strengthens it',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>If the same term is learned again, Zevra does not duplicate it: it adds <strong>+0.05</strong> confidence and one more use to the existing entry.</p>`,
  never:[`No AI call in this step`],
  why:`Repetition across real conversations is how a definition proves it is not a one-off.`},
 {id:'s6',t:'Someone teaches Zevra directly',from:'A',to:'E',tags:['human','ai:gpt-4o'],
  what:`<p>A person fills in the Teach form: the term, its meaning, an optional SQL rule, which business concept it belongs to, and whether it applies to the whole company or one connection. An AI call tidies the wording. It may not change the concept or invent SQL. The person previews the result and must confirm.</p><p>Taught terms start at a higher <strong>0.80</strong> confidence, but still go through the same nightly rules, so they are never promoted instantly.</p>`,
  ai:{model:'gpt-4o',sees:'The term, definition, rule and concept the person entered.',decides:'Cleaner wording of the term and definition only.',cant:'Change the concept, the scope, or create SQL the person did not give.'},
  moves:[{d:'out',t:'What the person typed into the form'},{d:'stay',t:'The confirmed term is stored in the company\'s room'}],
  never:[`Nothing is saved until the person confirms the preview`],
  why:`A person who deliberately teaches Zevra deserves higher starting trust, with the same safeguards as everything else.`},
 {id:'s7',t:'Every night, promote or drop',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>At 02:45, for every company, Zevra reviews learned terms. A term is <strong>promoted</strong> when it has been used at least <strong>10</strong> times and has confidence of at least <strong>0.80</strong>. It becomes a formal vocabulary entry. A term is <strong>deleted</strong> if it has at least <strong>5</strong> uses but confidence below <strong>0.20</strong>.</p>`,
  ex:{label:'Example',body:`"overdue"   used 12x, confidence 0.86  -> promoted to vocabulary
"cheap"     used 6x,  confidence 0.14  -> deleted`},
  never:[`No AI call: these are fixed thresholds`,`A term still in between simply waits for more evidence`],
  why:`Requiring both frequency and confidence means a term must be used a lot and mostly liked or uncorrected.`},
 {id:'s8',t:'A promoted term starts helping',from:'B',to:'E',tags:['rule','zdb','ai:text-embedding-ada-002'],
  what:`<p>Two things now happen automatically:</p><ul><li>The term is company <strong>vocabulary</strong>: the word-matching step (flow 3, step 5) recognises it in future questions and tells the query-writing AI what it means.</li><li>If the term is tied to a concept, that concept's text is rebuilt with the term included and re-embedded, so the concept-picking step can see it. It is also shown to the query-writing AI as <em>learned business knowledge, evidence rather than instruction</em>.</li></ul><p>Administrators can see learned terms and assign a concept to any that have none. There is no manual sync: the concept index refreshes by itself.</p>`,
  ai:{model:'text-embedding-ada-002 (an embedding model)',sees:'The concept\'s text, including the learned term. No company data rows.',decides:'Nothing. It returns numbers for searching.',cant:'Produce words.'},
  moves:[{d:'out',t:'The updated concept text only'},{d:'stay',t:'The new numbers are stored in Zevra\'s database'}],
  never:[`Learned terms never cross from one company to another`],
  why:`Closing the loop means that what people teach Zevra today shapes how it understands the next question.`}
]};

/* =========================== DATA BOUNDARY =========================== */
ZG.bnd = [
 {label:'Describing a table (setup)',
  caption:`During setup, only the <strong>definition</strong> of a table is sent: column names, types and the database's own comments. No rows.`,
  cols:['name  text','tier  text (enum)','status  text (enum)','on_time_delivery_pct  numeric'],hmask:['out','out','out','out'],
  rows:[['Continental Footwear Corp','tier_1','under_review','71.30'],['Lakeside Textiles LLC','tier_2','active','88.10'],['Pacific Rim Accessories','tier_2','active','93.40']],
  mask:[['stay','stay','stay','stay'],['stay','stay','stay','stay'],['stay','stay','stay','stay']],
  received:`Schema: retail_core, Table: suppliers
Columns:
  - name text NOT NULL
  - tier text (enum: supplier_tier) NOT NULL
  - status text (enum: supplier_status) NOT NULL
  - on_time_delivery_pct numeric NULL

(No rows, no values.)`},
 {label:'Learning allowed values (setup)',
  caption:`Zevra reads a few <strong>category</strong> values so it can spell filters correctly. Names and emails are never kept: a fixed filter rejects anything that looks like personal data.`,
  cols:['status','primary_contact_name','primary_contact_email'],hmask:['out','stay','stay'],
  rows:[['under_review','Derek Vanhorn','dvanhorn@continentalfootwear.com'],['active','Priya Nguyen','pnguyen@lakesidetextiles.com'],['active','Sam Okafor','sokafor@nationalaccessories.com']],
  mask:[['sum','stay','stay'],['sum','stay','stay'],['sum','stay','stay']],
  received:`Later, when a question needs it, the AI is shown allowed values like:

  suppliers.status: active, inactive, under_review   [observed values]

Never shown: contact names, contact emails (not sampled; and the
personal-data filter would reject them anyway).`},
 {label:'A small result (10 rows or fewer)',
  caption:`For a small result, the actual values <strong>are</strong> sent so the AI can write a correct answer. The same rows are also shown to the person directly.`,
  cols:['po_number','status','supplier_name','destination_warehouse_name'],hmask:['out','out','out','out'],
  rows:[['PO-2025-00234','partially_received','Continental Footwear Corp','Eastern Distribution Center'],['PO-2025-00267','partially_received','Continental Footwear Corp','Eastern Distribution Center'],['PO-2025-00352','acknowledged','Lakeside Textiles LLC','Eastern Distribution Center']],
  mask:[['out','out','out','out'],['out','out','out','out'],['out','out','out','out']],
  received:`5 row(s). Columns: po_number, status, supplier_name, destination_warehouse_name.
  status distribution: {partially_received=3, submitted=1, acknowledged=1}
Values:
  po_number = PO-2025-00234, PO-2025-00267, ...
  supplier_name = Continental Footwear Corp, Lakeside Textiles LLC, ...
Rows (each line is ONE row):
  1. po_number = PO-2025-00234; status = partially_received; ...`},
 {label:'A large result (more than 10 rows)',
  caption:`For a larger result, Zevra sends a <strong>summary</strong>: counts, totals and averages for numbers, the spread of category values, and about three sample values for other columns. The rest stays in Zevra.`,
  cols:['name','status','quality_rating','primary_contact_email'],hmask:['out','out','out','out'],
  rows:[['Apex Garment','active','3.9','lzhao@apexgarment.com'],['Pacific Outerwear','active','4.2','rchung@pacificouterwear.com'],['National Accessories','active','3.1','sokafor@nationalaccessories.com'],['Summit Activewear','active','4.5','mellison@summitactivewear.com'],['Lakeside Textiles','active','3.6','pnguyen@lakesidetextiles.com']],
  mask:[['out','sum','sum','out'],['out','sum','sum','out'],['out','sum','sum','out'],['stay','sum','sum','stay'],['stay','sum','sum','stay']],
  received:`20 row(s). Columns: name, status, quality_rating, primary_contact_email.
  status distribution: {active=19, under_review=1}
  quality_rating: sum=73.2, avg=3.66
  name: 20 distinct, e.g. Apex Garment, Pacific Outerwear, National Accessories
  primary_contact_email: 20 distinct, e.g. lzhao@apexgarment.com,
      rchung@pacificouterwear.com, sokafor@nationalaccessories.com

(The other 17 emails never leave Zevra.)`},
 {label:'A masked column',
  caption:`If an administrator has set a masking rule, the query itself is rewritten before it runs, so the real value is never fetched. Everything downstream, including the AI, only ever sees the masked value.`,
  cols:['name','primary_contact_email (masked)'],hmask:['out','out'],
  rows:[['Apex Garment','lz****'],['Pacific Outerwear','rc****'],['National Accessories','so****']],
  mask:[['out','out'],['out','out'],['out','out']],
  received:`SELECT name, LEFT(CAST(primary_contact_email AS TEXT), 2) || '****' AS primary_contact_email
FROM retail_core.suppliers

-> the database returns only the masked text; the real addresses are never fetched.`},
 {label:'An agent\'s query',
  caption:`<strong>Agents behave differently from chat:</strong> the rows a query returns (up to the row limit, typically 100) are given to the agent so it can reason about them. The limit, masking and row-level security still apply first.`,
  cols:['name','tier','status','on_time_delivery_pct'],hmask:['out','out','out','out'],
  rows:[['Continental Footwear Corp','tier_1','under_review','71.30'],['Fast Fashion Ltd','tier_2','active','78.50'],['Budget Basics','tier_3','active','82.00']],
  mask:[['out','out','out','out'],['out','out','out','out'],['out','out','out','out']],
  received:`[{"name":"Continental Footwear Corp","tier":"tier_1","status":"under_review","on_time_delivery_pct":71.30},
 {"name":"Fast Fashion Ltd","tier":"tier_2","status":"active","on_time_delivery_pct":78.50},
 ... up to the row limit]

(Only the last six tool exchanges are kept in each AI call.)`}
];

ZG.store = [
 ['Business data (orders, customers, stock, payments)','<strong>Lives here.</strong> It is the system of record and is never moved','Only what appeared in answers: the result tables saved with a conversation, plus up to 25 category values per column','Summaries, or the actual values of small results (10 rows or fewer), inside a question\'s prompts. Agents: the rows returned, up to the row limit'],
 ['Table and column structure, and the database\'s own comments','Lives here','A description of it: names, meaning, column roles, relationships','Names, types and comments, during discovery only'],
 ['What Zevra has learned about meaning (business names, vocabulary, learned terms)','Not stored here','<strong>Lives here</strong>, in the company\'s private section','Parts appear in prompts when relevant (concept text, resolved terms)'],
 ['Concept fingerprints (vectors)','Not stored here','<strong>Lives here</strong> (pgvector, in the company\'s section)','Only the concept text is sent to be turned into numbers. The numbers are kept by Zevra, not OpenAI'],
 ['Uploaded documents','Not stored here','Text pieces and their numbers. The original file sits on Zevra\'s server storage','Pieces are sent to be turned into numbers. If used for an answer, the closest pieces (up to 6) go into prompts'],
 ['Conversations, answers, result tables, audit trail','Not stored here','<strong>Lives here</strong>','The current question and its evidence summaries only, while it is being answered'],
 ['The database\'s own login (user and password) given to Zevra','Your account and policies','Stored with the connection (see "Known limits")','Never sent'],
 ['People\'s sign-in','Not stored here','Email, role, and the pointer to the company. Passwords are handled by the identity provider (Supabase Auth)','Never sent'],
 ['The OpenAI API key','Not stored here','Only in Zevra\'s server configuration','Not applicable'],
 ['Files or vector stores at OpenAI','Not applicable','Not applicable','<strong>None.</strong> Zevra keeps no files and no hosted vector store at OpenAI']
];

ZG.guards = [
 ['Allowed-values check','Values the AI put in a filter (like "Texas") are compared with the values known for that column. A value that does not exist is rejected instead of silently returning zero rows.'],
 ['Approved-objects gate','Every table in the query must be on the list approved for this question (the contract). A table outside it is rejected.'],
 ['Read-only rule','The query must begin with SELECT. Semicolons, INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, EXEC/EXECUTE, MERGE, GRANT and REVOKE are rejected, and so is <code>SELECT *</code>.'],
 ['Connection allow-list','Each connection lists the tables Zevra may use. Anything else is rejected.'],
 ['Join limit','At most 4 joins in a query.'],
 ['Row and time limits','A row limit is added automatically by kind of query: 50 for a single-record lookup, 100 for lists and joins, 200 for totals and counts, and never above 500. Very large or unfiltered queries on big tables are routed to a background run instead of answering inline. Time limits are 10, 30 or 90 seconds depending on the kind of query.'],
 ['Data contracts','Company-defined rules on specific tables: require a date filter, require a particular filter column, require a limit, or block full scans. A rule can block, warn, or add the missing constraint automatically.'],
 ['Row-level security','A rule can add a condition such as "only this person\'s region" to every query on a table, based on the signed-in person\'s attributes. If the attribute is missing, access is denied.'],
 ['Column masking','Sensitive columns can be removed, hashed, partly hidden or replaced by a constant, rewritten into the query itself before it runs.'],
 ['Audit trail','Each attempt (allowed or blocked), the final SQL and the outcome are recorded.']
];

ZG.limits = [
 ['Database passwords are stored as entered','The login Zevra uses for a company\'s database is saved with the connection in the company\'s private section of Zevra\'s database. It is not yet encrypted by Zevra itself; the code carries a note to move it to a secrets vault. Until then, give Zevra a dedicated, read-only database account with access only to the tables you want it to use.'],
 ['Chat queries rely on Zevra\'s read-only checks','Agent sessions mark the database connection as read-only. Chat queries are protected by the read-only rule and allow-lists described above, plus the permissions of the database account you provide. A read-only database account makes this airtight.'],
 ['Agents see rows; chat sees summaries','An agent is given the rows its queries return (up to the row limit). Chat sends summaries for results over 10 rows. If that matters for a data set, restrict the agent\'s databases or use masking and row-level security.'],
 ['The write-word check is crude','Before querying, Zevra declines questions containing words like delete, update, insert, modify, change, create, drop, truncate, approve, reject, cancel, void or reverse. It is a simple word match, so a legitimate question such as "how did stock change last week?" can be declined. The real protection is the read-only rule.'],
 ['Playbooks guide the agent; they do not force it','The agent reads its playbooks and chooses whether to follow one. Zevra does not check that every step was done or in order, and it does not track which step the agent is on. The step log shows what it actually did, so a reviewer can compare.'],
 ['AI answers can still be wrong','The fact-check step catches many slips but not all. That is why every answer shows its SQL and result rows. Check the working for anything important.'],
 ['Small results go to OpenAI in full','Results of 10 rows or fewer are sent with their values so the answer can be written. Use masking for columns that must never reach the AI.'],
 ['OpenAI is a third-party processor','Zevra sends prompts to OpenAI\'s API, as listed in this guide. Your agreement with OpenAI (or ours) governs how that provider handles them. This page does not describe OpenAI\'s own policies.'],
 ['Models are configuration, not constants','The model names shown are today\'s defaults. Each can be changed to another OpenAI model in Zevra\'s configuration without changing how the flows work. The provider address is fixed, so a model hosted elsewhere is not yet a configuration change (see Planned).']
];

ZG.faq = [
 ['Does OpenAI see my data?','Some of it, and this guide lists exactly what. During setup it sees table and column names, types and comments. During a question it sees the question, business descriptions, allowed values, and summaries of results (or the actual values for results of 10 rows or fewer). Agents also see the rows their queries return. It does not see database passwords, whole tables, or large result sets in full.'],
 ['Does Zevra change my database?','No. Zevra only runs checked, read-only SELECT queries and reads structure and a small sample of category values. Nothing is installed or written. Agent sessions are additionally marked read-only at the connection.'],
 ['Can one company see another company\'s information?','Not through Zevra. Each company has its own private section of Zevra\'s database, and every request is pinned to the signed-in person\'s section. If no section can be established, the request is refused.'],
 ['Does Zevra copy my data into its own database?','Not the database. It stores what it learned <em>about</em> the data (meanings, relationships, allowed values) and keeps the answers and result tables shown in conversations so they can be reopened.'],
 ['What stops the AI from running something dangerous?','The AI only proposes queries. Fixed rules decide what may run: read-only, approved tables only, join and row limits, masking, row-level security, and an audit record. These rules do not depend on the AI behaving.'],
 ['What happens when the AI is unsure or wrong?','If it cannot tell which concept a question is about, it asks you. If a filter returns nothing, Zevra checks whether the spelling was the problem before saying "no data". If there is no knowledge of the topic, it says so rather than inventing a number. A second AI call fact-checks the written answer, and every answer shows its working.'],
 ['Does Zevra learn from my questions?','Only from specific signals: a question that follows a clarification, a validated word-to-value choice, a correction, a thumbs-up, or explicit teaching. A learned term must be used at least 10 times with high confidence before it becomes company vocabulary. Learning stays inside your company\'s private section.'],
 ['Where does the AI run?','At OpenAI, called from Zevra\'s server. The comparisons that find the right business concept and the right documents run inside Zevra\'s own database.'],
 ['Can we use a different model?','Another OpenAI model: yes, it is a configuration setting per job (defaults are in the table on the Big picture page). A model hosted by you or another provider: not yet; it is on the Planned page with the cost and quality trade-offs.']
];

/* =========================== PLANNED (not built) =========================== */
ZG.roadmap = [
 {id:'packagents',n:1,t:'Agents that ship inside an industry pack',
  today:`An industry pack today carries business entities, vocabulary, suggested questions, KPI definitions and alert templates. It carries <strong>no agents</strong>: each customer builds theirs from scratch.`,
  idea:`A pack would also carry ready-made agents, each with its persona, goal, playbooks and starter questions, so a new retail or hospitality customer has useful agents on day one.`,
  how:[`The pack file gains an <code>agents</code> list. Each agent names the business concepts it needs (for example "inventory balance" and "purchase order").`,`When the pack is applied, Zevra creates the agents <strong>as drafts</strong> in the company's private space, with their playbooks.`,`An agent can be switched on only when the company has mapped its concepts to its own database. Zevra checks this with plain rules and tells the person what is missing.`,`A person reviews and edits the agent before activating it. Nothing runs by itself.`,`Removing the pack removes the agents it created, but never an agent the company edited or built itself.`],
  eg:{label:'Illustrative agents',rows:[['Retail','Stock-out and replenishment watch; Markdown and promotion performance; Returns and shrink investigator; Supplier performance review'],['Hospitality','Revenue analyst (occupancy, average rate, revenue per available room); Group and event pace; Guest-feedback themes; Food and beverage cost watch'],['Logistics','Late-shipment investigator; Carrier performance; Warehouse throughput'],['Healthcare','Claims denial analyst; Appointment no-show watch (read-only analytics, no clinical decisions)']]},
  tradeoffs:[`The agents are only as good as the company's data mapping, which is why they start as drafts.`,`Each agent needs a few real questions tested against sample data before it ships in a pack.`,`Playbooks (live today, see Agents) are what make a packaged agent more than a generic persona.`],
  ai:`No new AI call. The agents use the normal agent loop (flow 4).`},
 {id:'localmodel',n:2,t:'A self-hosted model for the smaller jobs',
  today:`Every AI call goes to OpenAI. Each job already has its own model setting, but the address of the provider is a single fixed value, so a different provider (including a model you host) cannot be plugged in by configuration alone.`,
  idea:`Host an open model (in your cloud or on your own servers) and send it the jobs it can do well, keeping OpenAI for the work where quality matters most.`,
  how:[`<strong>Step 1: a setting per job for the provider's address and key</strong>, so any single job can point to a hosted model. Everything else stays as is.`,`<strong>Step 2: measure before moving anything.</strong> Replay real, logged requests through the hosted model and compare its answers with the current ones, job by job. Only jobs that match move.`,`<strong>Step 3: move one job at a time</strong>, with the old setting one change away.`,`Embeddings (the numbers used to find concepts and documents) are a special case: a different embedding model produces different numbers, so the concept index and document memory must be rebuilt in one go.`],
  cost:{head:['Job','Model today','Share of measured AI spend','Good local candidate?'],rows:[
    ['Choosing the business concept (Stage 1)','gpt-4.1','about 28% after the move to Zevra\'s own index','<strong>Yes, first.</strong> It picks from about 20 candidates and returns strict JSON. This is the largest slice that is a simple classification.'],
    ['Planner (writes the query steps)','gpt-4.1','about 35-40%','Not yet. Quality-critical; the prompt is long and exact.'],
    ['Evaluator (is the result enough?)','gpt-4.1','about 7%','Maybe, after measuring.'],
    ['Composer + fact-check (writes the answer)','gpt-4.1','about 13%','Not yet. This is what the customer reads.'],
    ['Routing, strategy, term extraction, memory selection, onboarding analysis','gpt-4o-mini','well under 5% together','Technically yes, but there is little spend to save.'],
    ['Embeddings','text-embedding-ada-002','under 1%','Only for data-residency reasons, not cost.']
  ],note:`Shares are from Zevra's own measured 15-question run (17-18 October 2026) and will move as prompts change. The cheap calls people think of as "small tasks" are a very small part of the bill; most spend is in the large reasoning calls.`},
  tradeoffs:[`<strong>Cost:</strong> a hosted model replaces a per-call price with a fixed price (servers, usually GPUs) plus someone to run it. It saves money only at enough volume, and the measured figures suggest only Stage 1 is a big enough slice to matter.`,`<strong>Privacy:</strong> for the jobs that move, the text stays inside your environment instead of going to a third party. That is a real benefit for customers with strict rules, independent of cost.`,`<strong>Quality and risk:</strong> a smaller model may be less reliable on strict formats. That is why each job is measured first and can be switched back immediately.`,`<strong>Operations:</strong> uptime, updates and capacity become Zevra's job.`],
  ai:`Not built. Today all AI calls, including every small one, go to OpenAI.`},
 {id:'skills',n:3,t:'Skills: things an agent knows how to do',
  today:`An agent today has a persona, a goal, databases, a fixed set of safe tools and (now) playbooks. There is no way to add a new capability, such as writing a spreadsheet, or to package specialist knowledge such as how to check an invoice, and reuse it across agents.`,
  idea:`A <strong>skill</strong> is a packaged capability that can be attached to any agent. Two kinds: <strong>functional skills</strong> (specialist know-how for a business area, for example an invoice specialist) and <strong>generic skills</strong> (abilities that work on any data: a spreadsheet writer, a chart writer, a document reader).`,
  how:[`A skill is a small package: a name, a one-line "use when", instructions for the model, the tools it may use, and (for generic skills) the Zevra code that does the work.`,`<strong>Zevra code does the work, not model-written code.</strong> A spreadsheet writer, for example, receives rows the agent already fetched through the checked query path and produces the file with fixed code. The model chooses what goes in, never runs anything.`,`Attached skills are shown to the agent the way playbooks are, and their tools join its toolbox. The same limits apply: approved tables only, read-only access to your database, row limits, masking, audit.`,`Output files (a spreadsheet, a chart image) are saved in the company's private space in Zevra's database, never written to the customer's database, and offered as a download.`,`Skills are versioned and switched on per company, and each use appears in the agent's step log.`],
  eg:{label:'Illustrative skills',rows:[['Functional: Invoice specialist','Knows the company\'s invoice, purchase order and receipt objects; follows a three-way match method; flags mismatches and duplicates; explains each finding with the rows behind it'],['Functional: Cash-collection specialist','Ageing buckets, promise-to-pay tracking, who to chase first'],['Generic: Spreadsheet writer','Turns an agent\'s result rows into a formatted spreadsheet for download'],['Generic: Chart writer','Turns a result into a chart with the right type for the question'],['Generic: Document reader','Reads an uploaded PDF or document and answers from it, using the document memory Zevra already has']]},
  tradeoffs:[`<strong>Skill versus playbook versus agent:</strong> an agent is who and what it may touch; a playbook is how to investigate one kind of question; a skill is a capability or body of know-how that agents can share. A functional skill can contain playbooks.`,`<strong>Documents are untrusted input.</strong> A document reader must treat text inside a file as data, never as instructions, and its output still passes the same checks.`,`<strong>Governance:</strong> who may create a skill, who may switch it on, and how a change is reviewed need to be defined before customers can add their own. The first version would be authored by Zevra only.`,`Chat already draws charts from query results today, so a chart skill must reuse that, not duplicate it.`],
  ai:`No new AI call by itself: skills extend the agent loop (flow 4). A skill that needs its own model call would be listed in the AI table when built.`}
];

})(window.ZG);
