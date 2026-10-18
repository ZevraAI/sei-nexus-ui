(function(ZG){

var NOAGENT = `Acme's test company has no agents set up, so Zevra makes no AI call here and treats the question as an ordinary one.`;
var NOQUERY = `Not needed: Zevra answered without querying the database.`;

ZG.flows.f3 = {id:'f3', steps:[
 {id:'s1',t:'The question arrives, and Zevra pins it to the right company',from:'A',to:'B',tags:['rule'],
  what:`<p>The browser sends the question with its signed token. As in setup, Zevra verifies the token, finds the company room and role, and pins every database call in this request to that room. A conversation id ties the question to earlier turns.</p><p>Two shortcuts are checked first: a message starting with <code>/knowledge</code> proposes new business knowledge, and <code>/request-source</code> asks for a new data connection. Both are handled without querying data.</p>`,
  moves:[{d:'stay',t:'The question text goes from the browser to the Zevra app'}],
  never:[`No AI is involved yet`,`A request with no company room is refused, never run against shared space`],
  why:`Identity and company come first, so nothing below can ever read another company's information.`},
 {id:'s2',t:'Is this an ordinary question or a job for an agent?',from:'B',to:'E',tags:['ai:gpt-4o-mini'],cond:'only if the company has an active agent',
  what:`<p>If the company has at least one active agent, a small AI call classifies the question by <em>how</em> it should be handled: a normal chat answer, or an agent's open-ended investigation. It looks at the question only. If it is unsure, it chooses chat.</p><p>If the company has no agents, Zevra skips the call entirely, since chat is then the only option. If an agent is chosen, a second small call picks which agent (it needs at least 0.65 confidence, otherwise the question goes to chat). See flow 4.</p>`,
  ai:{model:'gpt-4o-mini',sees:'The question text, and nothing else.',decides:'Chat or agent, then (if agent) which one.',cant:'Query data, change settings, or escalate to an agent when unsure.'},
  moves:[{d:'out',t:'The question text'},{d:'no',t:'Any company data'}],
  why:`A cheap, fast model is enough to sort questions into two kinds, and defaulting to chat keeps behaviour predictable.`},
 {id:'s3',t:'Zevra recalls the conversation so far',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>For a follow-up, Zevra loads from its own database the last few turns and the <em>facts</em> of the previous query (which tables, filters and result shape it used), not just the wording of the earlier answer. This is what lets "which of those?" mean something.</p><p>When conversation memory is on, one more small AI call (gpt-4o-mini) looks at the list of business objects used earlier and picks the ones the new question refers to.</p>`,
  ex:{label:'Nothing to recall here',body:`First question in this conversation.`},
  moves:[{d:'stay',t:'Earlier turns are read from Zevra\'s database'}],
  never:[`Nothing from an earlier conversation of a different user is mixed in`],
  why:`Grounding follow-ups in what actually ran, instead of a paraphrase, stops drift between questions.`},
 {id:'s4',t:'Zevra checks the company\'s uploaded documents',from:'B',to:'E',tags:['ai:text-embedding-ada-002','vec','zdb'],
  what:`<p>If the company has uploaded documents (policies, contracts, manuals), Zevra checks whether any are relevant. The question is turned into numbers by the embedding model and compared, inside Zevra's database, with the numbers stored for each document piece. The six closest pieces are kept (there is no minimum similarity: the AI later judges whether they help).</p><p>This step answers one thing: <em>is document memory available for this question?</em> That fact is handed to the next AI call. If the answer will draw on documents, those pieces of text are included in the AI prompts that follow.</p>`,
  ex:{label:'In this test',body:`No uploaded document matched, so document memory is "not available".`},
  ai:{model:'text-embedding-ada-002 (an embedding model)',sees:'The question text.',decides:'Nothing. It returns numbers.',cant:'Produce words, or see any document: the comparison happens in Zevra\'s database.'},
  moves:[{d:'out',t:'The question text (to be turned into numbers)'},{d:'stay',t:'The document comparison runs in Zevra\'s database'},{d:'out',t:'Only if used: the closest document pieces (up to 6) go into the later AI prompts'}],
  why:`Doing the comparison locally means the documents themselves are not sent to OpenAI just to find out which are relevant.`},
 {id:'s5',t:'Zevra matches the question\'s words to the company\'s vocabulary',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Before any AI sees the question, Zevra's word-matching step looks for terms it already knows. It compares words and phrases of up to three words against the company's vocabulary, business entity names, allowed values and column names, handling plurals and separators. It is exact matching, not guessing, and keeps at most 8 matches.</p><p>The question itself is never rewritten. Matches are attached as notes (&ldquo;RESOLUTIONS&rdquo;) that tell the query-writing AI what the company's words mean.</p>`,
  ex:{label:'Example',body:`(no matches: the question has no company-specific words)`},
  moves:[{d:'stay',t:'Vocabulary is read from Zevra\'s database'}],
  never:[`No AI and no fuzzy matching`,`The question text is never changed`],
  why:`Plain matching is predictable and auditable: if a company defines "open orders", that definition is used every time, in the same way.`},
 {id:'s6',t:'Zevra finds the closest business concepts (vector search)',from:'B',to:'E',tags:['ai:text-embedding-ada-002','vec','zdb'],
  what:`<p>The question is turned into numbers again, and Zevra's database finds the <strong>20 business concepts</strong> whose fingerprints (built during discovery) are closest in meaning. For a follow-up, the previous question is included in the search and the previous question's concepts are always added.</p><p>This narrows hundreds of possible concepts to a short list without calling a language model. A company with 500 concepts sends the AI the same size of list as one with 50.</p>`,
  ex:{label:'Example',body:`question -> 1,536 numbers -> 20 nearest concepts in Zevra's database
(purchase-order is among them)`},
  ai:{model:'text-embedding-ada-002 (an embedding model)',sees:'The question text (plus the previous question for a follow-up).',decides:'Nothing. It returns numbers.',cant:'Produce words. The nearest-concept search itself runs in Zevra\'s database.'},
  moves:[{d:'out',t:'The question text'},{d:'stay',t:'The ranking of concepts happens in Zevra\'s database'}],
  never:[`If the concept index has not been built, Zevra fails clearly instead of guessing`],
  why:`Searching by meaning keeps the next, larger AI prompt about the same size however big the company is.`},
 {id:'s7',t:'AI chooses the concepts and the kind of answer',from:'B',to:'E',tags:['ai:gpt-4.1'],
  what:`<p>One AI call sees the question and the 20 candidate concepts (each written out in full) and decides which of them are relevant: none, one or several. It also decides the <strong>answer mode</strong>: query live data, answer from documents, both, ask a clarifying question, or say Zevra has no knowledge of this.</p><p>Zevra then checks the AI's answer. Any concept that is not really one of this company's concepts is discarded. If the answer contradicts itself (no concept chosen, yet "query data"), the AI is shown 40 candidates and the full concept list and asked once more. Never a third time.</p>`,
  ex:{label:'What the AI returns (shape)',body:`{"conceptKeys": ["purchase-order"],
 "resolutionType": "SINGLE",
 "routing": {"type": "QUERY_LIVE_DATA"}}`},
  ai:{model:'gpt-4.1',sees:'The question, the previous question (for follow-ups), the 20 candidate concepts with their descriptions, and one fact: whether document memory is available.',decides:'Which concepts matter, and which of five answer modes fits.',cant:'See table names, columns or any data. It chooses only among concepts it was shown.'},
  peek:{label:'Show the shape of what OpenAI receives (abridged)',body:`CANDIDATE CONCEPTS: this tenant's concepts most similar to the question.
Each line starts with the concept_key to use:
- purchase-order — Purchase Order (also called: purchase order, po, po header...)
  A procurement commitment from the retailer TO A SUPPLIER for goods...
- purchase-order-line — Purchase Order Line (also called: po line...)
- supplier — Supplier (also called: vendor...)
... (20 in total)

QUESTION:
What is the total ordered amount across all open purchase orders?

Runtime facts: Document memory available for this question: false`},
  moves:[{d:'out',t:'The question and 20 concept descriptions (pack text and promoted learned terms)'},{d:'no',t:'Table names, column names, any rows of data'}],
  never:[`The AI cannot invent a concept: the answer is checked against the real list`,`Zevra does not decide the answer mode itself: it relays the AI's choice`],
  why:`Deciding meaning is what language models are good at. Zevra's checks make sure the AI can only pick from what really exists.`},
 {id:'s8',t:'Zevra turns the concepts into the approved list of tables and columns',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Using the chosen concepts, Zevra looks up in its own database which of the company's tables represent them. That set becomes the <strong>contract</strong> for this question: the only tables and columns anything below is allowed to touch.</p><p>Zevra then renders the schema for the query-writing AI: table and column names, data types, business meaning, allowed category values and how tables join. Nothing outside the contract is described to it.</p>`,
  ex:{label:'Example',body:`Concept purchase-order -> table retail_core.purchase_orders
Approved for this question: purchase_orders only`},
  moves:[{d:'stay',t:'Concept-to-table links are read from Zevra\'s database'}],
  never:[`A table that is not in the contract can never be queried for this question`],
  why:`Narrowing before the AI writes any SQL keeps prompts small and keeps the AI inside the lines.`},
 {id:'s9',t:'A quick "is this a write request?" check',from:'B',to:'B',tags:['rule'],
  what:`<p>Zevra is read-only. If the question contains write-sounding words (delete, update, insert, create, drop, approve, cancel and similar), Zevra stops and replies politely that it can investigate but not change data. This is a simple word check. The real protection is in step 11, which would block a write query regardless.</p>`,
  ex:{label:'Example reply',body:`Zevra is a read-only operational intelligence platform. I can help you
investigate and understand your business data, but cannot perform modifications.`},
  never:[`Zevra's query rules allow only reading (see step 11)`],
  why:`A cheap early check saves the AI calls and gives a clear message. The query checks later are the safety net.`},
 {id:'s10',t:'AI writes the next database query',from:'B',to:'E',tags:['ai:gpt-4.1'],
  what:`<p>The investigation is a loop of up to <strong>6 steps</strong> (steps 10 to 13). Each time round, the AI writes <em>one</em> query. It sees the question, the approved schema, the allowed values, the resolved terms, and a <em>summary</em> of the evidence so far. It can also ask for more column details of an approved table, ask the user a clarifying question, or say it is done.</p><p>If a query fails with a database error, the AI is told and may correct it, at most twice.</p>`,
  ex:{label:'Example',body:`SELECT SUM(total_ordered_amount) AS total_open_ordered_amount
FROM retail_core.purchase_orders
WHERE status IN ('draft','submitted','acknowledged','partially_received')`},
  ai:{model:'gpt-4.1',sees:'The question; the approved tables and columns with meanings and allowed values; the resolved terms; any learned business knowledge for these concepts; a summary of the evidence so far.',decides:'The next SQL query, a request for more metadata, a clarifying question, or "done".',cant:'Run the query itself, touch a table outside the contract, or see passwords. What it writes is only a proposal until step 11 passes it.'},
  peek:{label:'Show the shape of what OpenAI receives (abridged, illustrative)',body:`Approved schema:
  retail_core.purchase_orders  (Purchase Order)
    po_number text | status text [allowed values include: submitted,
    acknowledged, partially_received, received] | total_ordered_amount numeric ...
RESOLUTIONS:
  "open purchase orders" -> status IN ('draft','submitted','acknowledged','partially_received')
Question: What is the total ordered amount across all open purchase orders?
Evidence so far: none`},
  moves:[{d:'out',t:'Question, approved schema, allowed values, resolved terms, a summary of earlier results'},{d:'no',t:'Passwords, tables outside the contract, large result sets'}],
  never:[`The AI cannot run anything: it only proposes SQL`],
  why:`One query at a time lets Zevra check, run and learn from each step, instead of trusting a long plan up front.`},
 {id:'s11',t:'Zevra checks the query before it may run',from:'B',to:'B',tags:['rule'],
  what:`<p>Every proposed query passes the same fixed checks, in this order. None of them uses AI:</p><ol style="margin:0;padding-left:1.2em"><li>Literal values the AI used are compared with the allowed values.</li><li>Every table must be inside the question's approved contract.</li><li>It must start with SELECT, with no semicolons, no write or admin keywords, and no <code>SELECT *</code>.</li><li>Every table must be on the connection's allow-list.</li><li>At most 4 joins.</li><li>A row limit is added (50 to 200 depending on the kind of query, never above 500) and a time limit.</li><li>Data contracts, <strong>row-level security</strong> for this person, and <strong>column masking</strong> are applied: masked columns are rewritten or removed in the query itself.</li><li>The attempt is recorded in the audit trail.</li></ol>`,
  ex:{label:'Example',body:`SELECT ... FROM retail_core.purchase_orders WHERE ... LIMIT 100
checked: SELECT only / approved table / allow-listed / 0 joins / row limit added`},
  never:[`A query that fails any check never reaches the database`,`Masked values are never fetched in readable form`],
  why:`The AI is allowed to be creative; these rules are not. Safety does not depend on the AI behaving.`},
 {id:'s12',t:'The query runs on the company\'s database',from:'B',to:'D',tags:['rule','src'],
  what:`<p>Zevra runs the approved query with the connection's credentials and a timeout. Results come back to Zevra, <em>not</em> to OpenAI. The full result is kept to show to the user, and a <em>summary</em> of it is what the AI will see next.</p>`,
  ex:{label:'Example',body:`1 row: total_open_ordered_amount = 135300`},
  moves:[{d:'in',t:'The query result comes from your database'},{d:'stay',t:'The full result stays in Zevra (shown to the person, saved with the conversation)'}],
  never:[`Only checked SELECT queries are sent: Zevra's rules allow nothing else`,`The result is not sent to OpenAI as-is: see step 13`],
  why:`Keeping the full result on Zevra's side, and sending the AI only a summary, limits what leaves your environment.`},
 {id:'s13',t:'AI judges whether the evidence is enough',from:'B',to:'E',tags:['ai:gpt-4.1'],
  what:`<p>An AI call reads the question and a <strong>summary</strong> of the results so far and decides one of three things: <em>sufficient</em> (answer now), <em>need more</em> (go round the loop again), or <em>dead end</em>. Its rules push it to be careful: an unverified &ldquo;no rows&rdquo; is not proof that nothing exists, an identifier alone is not an answer when a name was asked for, and a result that quietly covers only part of the data is not complete.</p><p><strong>What the summary contains:</strong> columns, counts, totals and averages for numbers, the spread of category values, and a few sample values. For results of 10 rows or fewer it includes the actual values.</p>`,
  ex:{label:'Example verdict',body:`SUFFICIENT: "The evidence directly sums the total ordered amount for all
open purchase orders, matching the question's scope and aggregation exactly."`},
  ai:{model:'gpt-4.1',sees:'The question and the summary of each step so far: the SQL, the row count, column statistics and sample values (the actual values when 10 rows or fewer).',decides:'Enough, need more, or dead end, with a one-sentence reason.',cant:'Run anything or change the query. It only judges.'},
  moves:[{d:'out',t:'A summary of the result: counts, totals, category spread, a few samples (all values if 10 rows or fewer)'},{d:'no',t:'Large result sets in full'}],
  never:[`The loop stops at 6 steps, or when the AI says it is done`],
  why:`Separating the writer from the judge lets Zevra catch a confident but wrong first attempt. A second look is cheap.`},
 {id:'s14',t:'AI writes the answer',from:'B',to:'E',tags:['ai:gpt-4.1'],
  what:`<p>Once the evidence is enough, an AI call writes the answer in plain English and decides which of the result tables to show beside it. For a result of 2 to 10 rows with several columns, Zevra gives it the rows line by line so a value cannot be attached to the wrong record.</p><p>Before the final call, the query-writing AI is asked once whether a small extra breakdown would help (usually it says no).</p>`,
  ex:{label:'Example answer',say:true,body:`The total ordered amount across all open purchase orders is $135,300.00.`},
  ai:{model:'gpt-4.1',sees:'The question and the evidence: summaries, with actual values only for small results.',decides:'The wording of the answer and which result tables to display.',cant:'Query data, or see rows beyond the summary. The tables shown to the person come straight from the database result, not from the AI.'},
  moves:[{d:'out',t:'The question and the evidence summaries'},{d:'stay',t:'The result tables shown to the person are the database\'s own rows'}],
  never:[`The AI does not retype the data table: it is displayed as returned`],
  why:`Keeping the table and the sentence separate means a mistake in wording cannot alter the numbers on screen.`},
 {id:'s15',t:'AI fact-checks the answer against the evidence',from:'B',to:'E',tags:['ai:gpt-4.1'],
  what:`<p>A second, narrow AI call checks whether the written answer matches the evidence. If it finds a mismatch (for example saying "three" when the evidence shows five), the answer is written once more with the findings pointed out. It is limited to one check and one rewrite, and if the check itself fails, the original answer is kept.</p><p>Zevra never edits the answer itself: it only asks again.</p>`,
  ex:{label:'Outcome here',body:`Answer matched the evidence; no rewrite.`},
  ai:{model:'gpt-4.1',sees:'The question, the evidence and the written answer.',decides:'Whether the answer is consistent with the evidence, and what is wrong if not.',cant:'Rewrite the answer itself, or request more data.'},
  moves:[{d:'out',t:'The question, evidence summary and the draft answer'}],
  never:[`It cannot loop: one check, at most one rewrite`],
  why:`Language models can mis-summarise. A second look catches many such slips, but it is a safeguard, not a guarantee. That is why the SQL and rows are always shown.`},
 {id:'s16',t:'The answer is delivered and saved',from:'B',to:'A',tags:['rule','zdb'],
  what:`<p>The person sees the answer, the tables, and an expandable <em>reasoning trace</em>: how each of their words was interpreted, every query that ran, and the AI's verdict at each step. Everything is saved with the conversation in the company's room, including the result rows shown, so it can be reopened and reviewed. A thumbs-up or down is stored with the run.</p>`,
  moves:[{d:'stay',t:'Answer, queries, result rows and the audit trail are saved in Zevra\'s database'}],
  never:[`Nothing is hidden: the SQL behind every answer can be inspected`],
  why:`Trust comes from being able to check. Every answer comes with its working.`},
 {id:'s17',t:'In the background, Zevra decides whether to learn something',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>After the answer, Zevra checks two situations: did this question follow a clarification, and is it a correction of the previous answer? Plain successful questions teach it nothing. Validated "this word means this value" choices are also remembered. This is flow 5.</p>`,
  never:[`A normal question does not change what Zevra knows`],
  why:`Learning only from specific, meaningful signals keeps the company's vocabulary clean.`}
],
examples:[
 {id:'A',label:'A simple total',question:'What is the total ordered amount across all open purchase orders?',
  intro:`A single factual question. Zevra needs one query. This is the real run from our test company.`,
  outcome:`<strong>$135,300.00</strong>, matching a direct check of the company's database.`,
  skip:{s2:NOAGENT},
  over:{
   s5:{ex:{label:'Real matches',body:`"open purchase orders" -> status IN (draft, submitted, acknowledged, partially_received)
                          [company vocabulary]
"purchase orders"      -> Purchase Order (table retail_core.purchase_orders)
"total ordered amount" -> purchase_orders.total_ordered_amount`}},
   s13:{ex:{label:'Real verdict',body:`SUFFICIENT: "The evidence directly sums the total ordered amount for all
open purchase orders, matching the question's scope and aggregation exactly."`}},
   s12:{ex:{label:'Real result',body:`1 row(s). total_open_ordered_amount: sum = 135300`}}
  },
  ledgerNote:'No routing call was made, because this company has no agents.',
  ledger:[
   {n:'Search uploaded documents',m:'embedding',k:'e',in:12,out:0},{n:'Find closest concepts',m:'embedding',k:'e',in:12,out:0},
   {n:'Pick concepts and answer mode',m:'gpt-4.1',in:3827,out:47},{n:'Write the query',m:'gpt-4.1',in:6537,out:250},
   {n:'Judge the evidence',m:'gpt-4.1',in:1711,out:53},{n:'Extra breakdown? (usually none)',m:'gpt-4.1',in:6654,out:165},
   {n:'Write the answer',m:'gpt-4.1',in:4576,out:52},{n:'Fact-check the answer',m:'gpt-4.1',in:479,out:11}]},
 {id:'B',label:'A name that doesn\'t match',question:'Give me the details of supplier Continental Footwear Corp.',
  intro:`The user typed a full stop after "Corp." and Zevra's first query matched nothing. Watch it notice, verify and recover. This is the real run.`,
  outcome:`Found the supplier after <strong>four</strong> queries: tier 1, Boston, under review, quality 2.10, on-time 71.30%, lead time 28 days, payment terms 45 days.`,
  skip:{s2:NOAGENT},
  over:{
   s10:{what:`<p>The loop ran <strong>four times</strong> for this question:</p><ol style="margin:0;padding-left:1.2em"><li>Query with <code>name ILIKE 'Continental Footwear Corp.'</code> returned 0 rows.</li><li>Verification: list supplier names to see how they are stored.</li><li>Retry with <code>'Continental Footwear Corporation'</code>: 0 rows.</li><li>Broader match <code>'%Continental Footwear%'</code>: 1 row.</li></ol>`,
        ex:{label:'Real final query (shortened)',body:`SELECT id, code, name, city, tier, status, quality_rating,
       on_time_delivery_pct, lead_time_days, payment_terms_days, ...
FROM retail_core.suppliers
WHERE name ILIKE '%Continental Footwear%'`}},
   s13:{ex:{label:'Real verdicts, in order',body:`1. NEED MORE DATA: "returned zero rows, but there is no evidence yet that the
   filter matches how the supplier names are stored, so a verification step
   is needed."
2. NEED MORE DATA: "a verification step has been run and may reveal a variation"
3. NEED MORE DATA: "still no confirmation that all name variations were checked"
4. SUFFICIENT: "returned the full details for 'Continental Footwear Corp', matching
   the question's request exactly."`}}
  },
  ledgerNote:'Four queries mean four writer calls and four judge calls.',
  ledger:[
   {n:'Search uploaded documents',m:'embedding',k:'e',in:11,out:0},{n:'Find closest concepts',m:'embedding',k:'e',in:11,out:0},
   {n:'Pick concepts and answer mode',m:'gpt-4.1',in:3826,out:46},
   {n:'Write the query (1)',m:'gpt-4.1',in:6356,out:232},{n:'Judge (1)',m:'gpt-4.1',in:1717,out:63},
   {n:'Write the query (2)',m:'gpt-4.1',in:6494,out:126},{n:'Judge (2)',m:'gpt-4.1',in:1820,out:78},
   {n:'Write the query (3)',m:'gpt-4.1',in:6607,out:258},{n:'Judge (3)',m:'gpt-4.1',in:1982,out:74},
   {n:'Write the query (4)',m:'gpt-4.1',in:6765,out:247},{n:'Judge (4)',m:'gpt-4.1',in:2393,out:63},
   {n:'Extra breakdown? (usually none)',m:'gpt-4.1',in:7166,out:87},
   {n:'Write the answer',m:'gpt-4.1',in:4881,out:250},{n:'Fact-check the answer',m:'gpt-4.1',in:844,out:11}]},
 {id:'C',label:'A follow-up',question:'Which of those are overdue?',
  intro:`Asked straight after &ldquo;Show me all open purchase orders with the supplier name and destination warehouse&rdquo; (5 orders). &ldquo;Those&rdquo; only makes sense because Zevra remembers. Real run.`,
  outcome:`<strong>Two</strong> orders are overdue: PO-2025-00352 (Lakeside Textiles LLC, expected 2025-10-27) and PO-2025-00488 (Pacific Rim Accessories, expected 2025-12-17). &ldquo;Overdue&rdquo; here means the expected date has passed and nothing arrived.`,
  skip:{s2:NOAGENT},
  over:{
   s3:{ex:{label:'What is recalled',body:`Previous question : Show me all open purchase orders with supplier name
                    and destination warehouse
Previous result   : 5 rows (po_number, status, supplier_name, destination_warehouse_name)
Concepts          : purchase-order, supplier, warehouse`},
       tags:['rule','zdb','ai:gpt-4o-mini']},
   s6:{ex:{label:'What is searched',body:`previous question + "Which of those are overdue?"  ->  closest concepts
(the previous question's concepts are always added)`}},
   s10:{what:`<p>Here the loop starts differently. Zevra seeds it with the <em>previous result</em> and the judge looks at it first: the 5 orders are there, but with no delivery dates. So the loop adds two queries:</p><ol style="margin:0;padding-left:1.2em"><li>The same 5 orders, adding expected and actual delivery dates.</li><li>Filter to those past their expected date and not yet delivered.</li></ol>`,
        ex:{label:'Real final query (shortened)',body:`SELECT po_number, status, supplier_name, destination_warehouse_name,
       expected_delivery_date, actual_delivery_date
FROM ( ...the 5 open purchase orders joined to suppliers and warehouses... ) AS open_pos
WHERE expected_delivery_date < CURRENT_DATE AND actual_delivery_date IS NULL`}},
   s13:{ex:{label:'Real verdicts, in order',body:`1. (on the carried-over result) NEED MORE DATA: dates are needed
2. NEED MORE DATA: "includes expected and actual delivery dates ... but does not
   filter or identify which are overdue"
3. SUFFICIENT: "directly identifies which purchase orders are overdue,
   matching the question's scope"`}},
   s15:{ex:{label:'Outcome here',body:`The fact-check raised an issue, so the answer was written once more
(three writing calls in total).`}},
   s17:{what:`<p>Because this was a follow-up, one more AI call (gpt-4o) checks whether the question <em>corrected</em> the previous answer. Here it did not, so nothing is learned. A real correction would lower the confidence of the related learned term. See flow 5.</p>`,tags:['ai:gpt-4o']}
  },
  ledgerNote:'A follow-up adds a memory-selection call and a correction check.',
  ledger:[
   {n:'Search uploaded documents',m:'embedding',k:'e',in:6,out:0},{n:'Find closest concepts',m:'embedding',k:'e',in:20,out:0},
   {n:'Pick concepts and answer mode',m:'gpt-4.1',in:3852,out:55},{n:'Pick remembered objects',m:'gpt-4o-mini',k:'m',in:306,out:7},
   {n:'Judge the carried-over result',m:'gpt-4.1',in:1835,out:68},
   {n:'Write the query (1)',m:'gpt-4.1',in:8375,out:241},{n:'Judge (1)',m:'gpt-4.1',in:2151,out:73},
   {n:'Write the query (2)',m:'gpt-4.1',in:8741,out:364},{n:'Judge (2)',m:'gpt-4.1',in:2397,out:54},
   {n:'Extra breakdown? (usually none)',m:'gpt-4.1',in:8969,out:108},
   {n:'Write the answer',m:'gpt-4.1',in:5693,out:176},{n:'Fact-check the answer',m:'gpt-4.1',in:1631,out:129},
   {n:'Rewrite after fact-check',m:'gpt-4.1',in:5883,out:189},{n:'Notice a correction',m:'gpt-4o',in:279,out:11}]},
 {id:'D',label:'Too vague',question:'How are we doing?',
  intro:`A question with no subject. A good system asks rather than guesses. Real run.`,
  outcome:`Zevra asked: <em>&ldquo;Can you clarify what specific aspect of performance or which area (such as sales, inventory, procurement, or store operations) you are asking about?&rdquo;</em> No data was queried.`,
  skip:{s2:NOAGENT,s10:NOQUERY,s11:NOQUERY,s12:NOQUERY,s13:NOQUERY,s14:`Not needed: the clarifying question comes straight from step 7.`,s15:NOQUERY},
  over:{
   s7:{what:`<p>The AI chose <strong>no concept</strong> on its first look, but still said "query data". That is self-contradictory, so Zevra showed it 40 candidates and the full concept list and asked once more. The second answer was <strong>ask for clarification</strong>.</p>`,
       ex:{label:'Second AI answer (shape)',body:`{"conceptKeys": [],
 "routing": {"type": "ASK_CLARIFICATION",
             "clarificationQuestion": "Can you clarify what specific aspect..."}}`}},
   s16:{what:`<p>The clarifying question is shown as the reply. Zevra remembers that this turn was a clarification, so if the next answer succeeds, it can learn from it (flow 5).</p>`}
  },
  ledgerNote:'Two concept-picking calls because of the one allowed retry. No data was touched.',
  ledger:[
   {n:'Search uploaded documents',m:'embedding',k:'e',in:5,out:0},{n:'Find closest concepts',m:'embedding',k:'e',in:5,out:0},
   {n:'Pick concepts and answer mode',m:'gpt-4.1',in:3820,out:44},{n:'Find concepts (wider retry)',m:'embedding',k:'e',in:5,out:0},
   {n:'Pick concepts again (40 candidates)',m:'gpt-4.1',in:3984,out:91}]},
 {id:'E',label:'Something Zevra doesn\'t have',question:'What is our customer churn rate?',
  intro:`The company's connected data has no customer-churn information. The safe answer is to say so. Real run.`,
  outcome:`<em>&ldquo;I don't have approved knowledge or data sources for this question. Use /knowledge to propose adding this, or /request-source to request a data connection.&rdquo;</em> No number was invented. A knowledge gap was recorded for the administrator.`,
  skip:{s2:NOAGENT,s10:NOQUERY,s11:NOQUERY,s12:NOQUERY,s13:NOQUERY,s14:`Not needed: the reply is fixed wording for "no knowledge".`,s15:NOQUERY},
  over:{
   s7:{what:`<p>No concept matched, and no document memory exists, so the AI said the company has no relevant knowledge. Because that is the one case where a retrieval slip could cause a wrong "no", Zevra gave the AI a second look with 40 candidates and the full concept list. It still said no.</p>`,
       ex:{label:'Second AI answer (shape)',body:`{"conceptKeys": [],
 "routing": {"type": "KNOWLEDGE_GAP"}}`}},
   s16:{what:`<p>The fixed message is shown and a <em>knowledge gap</em> record (the question, marked open) is saved so an administrator can see what people are asking for that Zevra cannot yet answer.</p>`}
  },
  ledgerNote:'No data was queried and no figure was invented.',
  ledger:[
   {n:'Search uploaded documents',m:'embedding',k:'e',in:7,out:0},{n:'Find closest concepts',m:'embedding',k:'e',in:7,out:0},
   {n:'Pick concepts and answer mode',m:'gpt-4.1',in:3822,out:44},{n:'Find concepts (wider retry)',m:'embedding',k:'e',in:7,out:0},
   {n:'Pick concepts again (40 candidates)',m:'gpt-4.1',in:3986,out:46}]}
]};

})(window.ZG);
