window.ZG = window.ZG || {flows:{}};
/* Update `reviewed` whenever the guide is re-checked against the code (see README). */
ZG.meta = {reviewed: '18 October 2026'};
(function(ZG){

ZG.places = [
 {k:'A', name:'People (browser)', short:'Where people ask and approve', what:`Everyone uses Zevra through a web page. People sign in, ask questions, review what Zevra proposes during setup, and read answers, tables and the reasoning behind them.`,
  has:[`The signed-in session (a signed token from the identity provider)`,`What the person is looking at right now`,`Nothing else: no database passwords after they are submitted, no OpenAI key`],
  not:[`The OpenAI key (it stays on Zevra's server)`,`Direct access to the company's database`,`Other companies' information`]},
 {k:'B', name:'Zevra app', short:'The rules and the conductor', what:`Zevra's application server is the conductor. It checks who you are, decides which company's private space to use, calls the databases and OpenAI, and enforces every safety rule. It holds no company data of its own between requests.`,
  has:[`The rules: read-only checks, approved-object limits, row limits, masking, auditing`,`The sequence of steps for each flow`,`The OpenAI API key (server side only)`],
  not:[`A copy of any company's data`,`Any ability to write to a company's database: it only runs checked SELECT queries`,`Browsers never reach OpenAI directly: every AI request goes through here`]},
 {k:'C', name:'Zevra database', short:'What Zevra knows about each company', what:`A PostgreSQL database (with a vector-search extension) that Zevra owns. Each company gets its own private section (a <em>schema</em>) holding what Zevra has learned <em>about</em> that company's data. A small shared section maps each email address to the right company.`,
  has:[`Business meaning of each table and column, allowed category values, relationships, vocabulary, learned terms`,`The concept index: numbers (vectors) used to find the right business concept fast`,`Conversations, answers, and the result tables shown in them`,`Uploaded documents as text pieces plus vectors`,`Agents, reports, alert rules, audit records, and the saved connection settings`],
  not:[`A full copy of the company's database`,`Another company's information in the same section: each company has its own`]},
 {k:'D', name:'Your database', short:'The company\'s own data, untouched', what:`The company's system of record: today PostgreSQL, Oracle or a REST API. Zevra connects with the credentials the administrator provides and only <em>reads</em>: the structure (table and column definitions), checked SELECT queries, and a small sample of category values.`,
  has:[`All the real business data: orders, customers, stock, payments`,`Its own access controls: Zevra can only see what the connecting account can see`],
  not:[`Anything written by Zevra: no inserts, updates, deletes or schema changes`,`Zevra software: nothing is installed in the company's database`]},
 {k:'E', name:'OpenAI', short:'Language models and embeddings', what:`OpenAI provides the language models that read and write text, and the embedding model that turns text into searchable numbers. Zevra's server sends text requests to OpenAI's API and receives text back. Zevra no longer keeps any files or vector stores at OpenAI.`,
  has:[`Only the text in each request, for the length of that request`,`Models used today (defaults): gpt-4.1, gpt-4o, gpt-4o-mini and text-embedding-ada-002`],
  not:[`Database passwords or connection strings`,`Whole tables or large result sets: large results are summarised first`,`Files or a hosted vector store belonging to Zevra`]}
];

ZG.flowCards = [
 {n:'Flow 1',t:'Company setup',go:'f1',d:`A private space is created, the first administrator signs in, and the company's database is connected.`,ai:false,aiText:'No AI in this flow'},
 {n:'Flow 2',t:'Discovering data',go:'f2',d:`Zevra reads table definitions and uses AI to describe what each table means. It never copies the rows.`,ai:true,aiText:'AI sees names, types and comments only'},
 {n:'Flow 3',t:'Asking a question',go:'f3',d:`From plain English to a checked query to a written answer, with every AI call counted.`,ai:true,aiText:'AI writes, judges and explains'},
 {n:'Flow 4',t:'Agents',go:'f4',d:`For open-ended work, an agent decides which look-ups to run, one at a time, within strict limits.`,ai:true,aiText:'AI reasons, rules enforce'},
 {n:'Flow 5',t:'Self-learning',go:'f5',d:`Company-specific words are learned from use, but must earn trust before they count.`,ai:true,aiText:'AI extracts wording only'}
];

ZG.aiUses = [
 {n:1,area:'Setup',what:'Recommend which tables matter',model:'gpt-4o-mini',when:'Optional, once per large database (cached)',sees:'Table names, column counts and the first 10 column names of each table',decides:'Which 10–15 tables look like core business tables; skips audit, log and temporary tables'},
 {n:2,area:'Setup',what:'Describe each table',model:'gpt-4o-mini',when:'For every selected table, 4 tables per call',sees:'Column names, types, the database\'s own comments, and the industry pack\'s concept list',decides:'Business name, purpose, which columns are identifiers or statuses, suggested vocabulary, and which pack concept the table is'},
 {n:3,area:'Setup',what:'Build concept fingerprints',model:'text-embedding-ada-002',when:'Whenever a concept\'s text is new or changed (and the index refreshes)',sees:'Concept text only: name, aliases, description, meaning, learned terms',decides:'Nothing. It returns numbers used for searching'},
 {n:4,area:'Setup',what:'Index an uploaded document',model:'text-embedding-ada-002',when:'When a document is uploaded',sees:'The document text, in pieces of about 850 words',decides:'Nothing. It returns numbers used for searching'},
 {n:5,area:'Questions',what:'Route: ordinary question or agent job?',model:'gpt-4o-mini',when:'Every question, but only if the company has an active agent',sees:'The question text',decides:'Chat or agent. Uncertain cases default to chat'},
 {n:6,area:'Questions',what:'Pick the right agent',model:'gpt-4o-mini',when:'Only when routed to an agent',sees:'The question and the list of agents',decides:'Which agent, if its confidence is at least 0.65; otherwise ordinary chat'},
 {n:7,area:'Questions',what:'Turn the question into searchable numbers',model:'text-embedding-ada-002',when:'Every question (once for documents, once for concepts)',sees:'The question text',decides:'Nothing. It returns numbers used for searching'},
 {n:8,area:'Questions',what:'Pick business concepts and the answer mode',model:'gpt-4.1',when:'Every question',sees:'The question, the previous question, and up to 20 candidate concepts',decides:'Which concepts matter and whether to query data, answer from documents, ask for clarification, or say there is no knowledge'},
 {n:9,area:'Questions',what:'Remember what we were talking about',model:'gpt-4o-mini',when:'Follow-up questions, when conversation memory is on',sees:'The list of business objects used earlier in the conversation',decides:'Which of them the new question refers to'},
 {n:10,area:'Questions',what:'Write the database query',model:'gpt-4.1',when:'Each step of the investigation, up to 6 steps',sees:'The question, the approved tables and columns, allowed values, resolved terms, and a summary of results so far',decides:'The next SQL query, or a request for more metadata, or "done"'},
 {n:11,area:'Questions',what:'Judge whether the evidence is enough',model:'gpt-4.1',when:'After each query',sees:'The question and a summary of the results so far',decides:'Enough, need more, or dead end'},
 {n:12,area:'Questions',what:'Write the answer',model:'gpt-4.1',when:'Once the evidence is enough',sees:'The question and the evidence (summaries; actual values only for small results)',decides:'The wording of the answer and which result tables to display'},
 {n:13,area:'Questions',what:'Fact-check the answer',model:'gpt-4.1',when:'After every written answer',sees:'The question, the evidence and the answer',decides:'Whether the answer matches the evidence; if not, it is rewritten once'},
 {n:14,area:'Questions',what:'Notice a correction',model:'gpt-4o',when:'Follow-up questions in a conversation',sees:'The new question, the previous question and the previous answer',decides:'Whether the user is correcting the previous answer'},
 {n:15,area:'Agents',what:'The agent\'s reasoning loop',model:'gpt-4o',when:'Each step the agent takes, up to its step limit',sees:'The task, the approved business objects, and the last six tool results',decides:'Which tool to use next, or the final answer'},
 {n:16,area:'Agents',what:'Draft an automation from plain English',model:'gpt-4o',when:'When a user asks for it',sees:'The requirement the user typed',decides:'A draft workflow the user can review and edit'},
 {n:17,area:'Agents',what:'Write an alert message',model:'gpt-4.1',when:'When a metric triggers an alert rule',sees:'The rule, the metric and how far it deviated',decides:'The wording of the message'},
 {n:18,area:'Agents',what:'AI step inside an automation',model:'gpt-4.1',when:'When a workflow contains an AI step',sees:'What the workflow passes to it',decides:'The step\'s written or structured output'},
 {n:19,area:'Learning',what:'Extract business terms',model:'gpt-4o-mini',when:'After a question that followed a clarification and succeeded',sees:'The question and the SQL that answered it',decides:'Up to 3 term-to-SQL definitions'},
 {n:20,area:'Learning',what:'Tidy a taught definition',model:'gpt-4o',when:'When a person submits the Teach form',sees:'The term, definition, rule and concept the person entered',decides:'Clean wording only. It may not change the concept or invent SQL'}
];

/* =========================== FLOW 1 =========================== */
ZG.flows.f1 = {id:'f1', steps:[
 {id:'s1',t:'Zevra\'s team creates the company',from:'A',to:'B',tags:['rule','human'],
  what:`<p>A Zevra platform administrator fills in one form: company name, a short identifier (the <em>slug</em>), plan, billing contact, user limit, and the first administrator's email.</p><p>Zevra checks the form before doing anything: the slug must be 2 to 63 lowercase letters, digits or hyphens; <code>public</code> and <code>default</code> are reserved; the plan must be one of Trial, Standard, Professional or Enterprise; the password must be at least 8 characters.</p>`,
  ex:{label:'Example',body:`Name:        Acme Retail
Slug:        acme-retail
Plan:        STANDARD
First admin: ana@acmeretail.com`},
  moves:[{d:'stay',t:'Form values go from the browser to the Zevra app'}],
  never:[`No AI is involved`,`Nothing is created in the company's own database`],
  why:`Strict checks up front mean the company's private space is only ever built from clean, predictable names.`},
 {id:'s2',t:'Zevra records the company in a shared register',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>One row is written to the shared company register in Zevra's database: id, slug, name, plan, status <strong>ACTIVE</strong>, contact, user limit, and the name of the private section that is about to be created.</p><p>This register and the email-to-company map are the only shared tables. Everything else belongs to one company.</p>`,
  ex:{label:'Example row',body:`slug:        acme-retail
schema_name: tenant_acme_retail
status:      ACTIVE`},
  moves:[{d:'stay',t:'Company details are stored in Zevra\'s database (shared register)'}],
  never:[`No customer business data exists yet`],
  why:`A single register lets Zevra look up, suspend or remove a company without touching other companies.`},
 {id:'s3',t:'Zevra builds the company\'s private room',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Inside Zevra's PostgreSQL database, a separate named section is created just for this company: a <em>schema</em>. Think of it as a locked room: tables inside it can only be reached by a request that has been pinned to that room.</p><p>The name is derived from the slug (<code>tenant_acme_retail</code>) and checked against a strict pattern before use, so a crafted name can never reach another section.</p>`,
  ex:{label:'Example',body:`CREATE SCHEMA tenant_acme_retail`},
  moves:[{d:'stay',t:'An empty private section appears in Zevra\'s database'}],
  never:[`The company never shares tables with another company`],
  why:`Separate sections, rather than one big table with a "company" column, mean a mistake in a query cannot accidentally mix two companies' information.`},
 {id:'s4',t:'Zevra creates all the tables, in two phases',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Zevra runs its numbered database setup scripts (<em>migrations</em>) inside the new room: first the basic structure, then a seed step, then the remaining scripts.</p><p>If any phase fails, Zevra deletes the half-built room and marks the company <strong>DEPROVISIONED</strong>, so a broken company is never left behind.</p><p>The same scripts also run at startup on every existing company, so every room is always up to date.</p>`,
  moves:[{d:'stay',t:'Tables for objects, columns, vocabulary, conversations, agents, audit and more are created'}],
  never:[`A failed setup is never left half-finished`],
  why:`Setup is all-or-nothing, so support never has to repair a half-created company by hand.`},
 {id:'s5',t:'The first administrator account is created',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>Zevra adds a default business area called <strong>PLATFORM</strong> and the administrator's account. The password is stored only as a one-way hash (BCrypt), never as readable text.</p><p>It also writes a pointer in the shared profile table: <em>this email &rarr; this company room, role ADMIN, status INVITED</em>. That pointer is how sign-in later knows which room to use.</p>`,
  ex:{label:'Example pointer',body:`ana@acmeretail.com -> tenant_acme_retail  (ADMIN, INVITED)`},
  moves:[{d:'stay',t:'Account, hashed password and email-to-company pointer are stored in Zevra\'s database'}],
  never:[`No readable password is stored by Zevra`],
  why:`The pointer is what keeps one email address bound to exactly one company room.`},
 {id:'s6',t:'An invitation email is sent',from:'B',to:'A',tags:['rule'],
  what:`<p>Zevra asks its identity provider (Supabase Auth) to email the administrator an invitation. Ana follows the link and sets her password with the identity provider.</p><p>If the email cannot be sent, the company still exists. A platform administrator can resend the invite or generate a one-time recovery link.</p>`,
  moves:[{d:'stay',t:'Email address goes to the identity provider to send the invitation'}],
  never:[`No AI model is involved`,`Zevra does not see the password Ana chooses`],
  why:`Delegating sign-in to a dedicated identity provider keeps password handling out of Zevra's own code.`},
 {id:'s7',t:'Ana signs in, and Zevra works out which room is hers',from:'A',to:'C',tags:['rule','zdb'],widget:'isolation',
  what:`<p>After sign-in the browser sends a signed token with each request. Zevra verifies the signature, looks the email up in the shared profile table, and finds the company room and role.</p><p>From then on, every database call in that request is <em>pinned</em> to that room. If no room can be established, Zevra refuses the request. It never falls back to shared space.</p>`,
  moves:[{d:'stay',t:'Signed token from the browser to the Zevra app'},{d:'stay',t:'Email looked up in the shared profile table'}],
  never:[`A request can never reach another company's room`,`There is no "default to everything" fallback`],
  why:`This pinning is the foundation of tenant isolation: it happens in one place, for every request, before any business logic runs.`},
 {id:'s8',t:'Ana adds the company\'s database as a data source',from:'A',to:'B',tags:['human','rule'],
  what:`<p>Ana chooses the type (PostgreSQL, Oracle or REST API), enters the address, username and password, which schemas and tables Zevra may use, and a <strong>read-only</strong> flag (on by default). She must also choose an industry pack: Zevra never guesses one.</p><p>The connection and the pack are saved together in a single step: if the pack cannot be applied, the connection is not left behind.</p>`,
  ex:{label:'Example',body:`Type:      POSTGRES
Address:   jdbc:postgresql://db.acmeretail.com:5432/retail_core
Allowed:   schema retail_core
Read-only: yes
Pack:      Retail & E-commerce`},
  moves:[{d:'stay',t:'Connection details are saved in Acme\'s private room in Zevra\'s database'}],
  never:[`Zevra does not install anything in Acme's database`,`The administrator's database password is not sent to OpenAI`],
  why:`Choosing the pack explicitly avoids silently giving a healthcare company retail vocabulary.`},
 {id:'s9',t:'Zevra tests the connection',from:'B',to:'D',tags:['rule','src'],
  what:`<p>Zevra opens a connection with the supplied credentials and runs a tiny probe query with a short timeout. The result (success or a cleaned-up error message) is saved so the administrator sees it straight away.</p>`,
  moves:[{d:'in',t:'A one-row probe result comes back from the company\'s database'}],
  never:[`No business data is read`,`No AI is involved`],
  why:`Finding a typo in a password now is far better than a confusing failure during discovery.`},
 {id:'s10',t:'The industry pack is applied',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>A <strong>pack</strong> is a ready-made starter set of business knowledge for an industry: concepts (the Retail pack has 54, such as Product, Supplier, Purchase Order), vocabulary, KPIs and suggested questions. Packs available today: Retail &amp; E-commerce, Financial Services &amp; Accounting, Healthcare &amp; Clinical Operations, Hospitality &amp; Travel, Logistics &amp; Supply Chain, and ServiceNow ITSM.</p><p>Applying it records "this connection uses the Retail pack" and adds the vocabulary. The pack is Zevra's own content: it contains no customer data. No tables have been discovered yet, so there is nothing to classify and no AI call is needed here. That comes next.</p>`,
  ex:{label:'A real pack concept (shortened)',body:`purchase-order — Purchase Order
  also called: purchase order, po, po header, procurement order
  A procurement commitment from the retailer TO A SUPPLIER for goods
  or services. The retailer is the buyer. Does NOT represent a
  customer-facing sale (see Sales Transaction)...
  Used for procurement spend tracking, supplier commitment management
  and open-order reporting.`},
  moves:[{d:'stay',t:'Pack assignment and vocabulary are saved in Acme\'s room'}],
  never:[`No AI call yet`,`No Acme data is involved`],
  why:`Starting from a vocabulary of the industry means Zevra already knows what "supplier" or "purchase order" generally mean before it sees a single table.`},
 {id:'s11',t:'Acme is ready for discovery',from:'B',to:'A',tags:['rule'],
  what:`<p>The company now has a private room, a signed-in administrator, a connected and tested data source and an applied pack. What is missing is knowledge of Acme's actual tables. That is flow 2.</p><p>AI calls in this entire flow: <strong>zero</strong>.</p>`,
  moves:[{d:'ok',t:'Nothing has been sent to OpenAI so far'}],
  why:`Everything so far is deterministic setup, so it can be audited and repeated exactly.`}
]};

/* =========================== FLOW 2 =========================== */
ZG.flows.f2 = {id:'f2', steps:[
 {id:'s1',t:'Zevra lists the tables in the database',from:'B',to:'D',tags:['rule','src'],
  what:`<p>With one query against the database's own catalogue (<code>information_schema</code>), Zevra lists every table in the allowed schema with its number of columns. It is a single round trip however large the schema is.</p>`,
  ex:{label:'What comes back',body:`purchase_orders        (17 columns)
purchase_order_lines   (14 columns)
suppliers              (18 columns)
audit_log              (6 columns)
...`},
  moves:[{d:'in',t:'Table names and column counts come from your database'}],
  never:[`No rows are read`,`No AI is involved`],
  why:`Reading only the catalogue is fast and touches no business data.`},
 {id:'s2',t:'AI suggests which tables matter',from:'B',to:'E',tags:['ai:gpt-4o-mini'],cond:'optional, for large databases',
  what:`<p>Large databases can have hundreds of tables. Zevra sends one compact list to a small AI model and asks for the 10 to 15 most important <em>business</em> tables, skipping audit, log, history, temporary and backup tables. The answer is cached so a page refresh costs nothing.</p>`,
  ex:{label:'What the AI is shown (illustrative)',body:`Schema: retail_core   Total tables: 41
purchase_orders (17 cols): id, po_number, supplier_id, status, ... +12 more
suppliers (18 cols): id, code, name, tier, status, ... +13 more
audit_log (6 cols): id, event, at, ...`},
  ai:{model:'gpt-4o-mini',sees:'Table names, column counts and the first 10 column names of each table.',decides:'Which tables look like core business tables, with a one-line reason and a category.',cant:'See any row of data, or add a table that is not in the list.'},
  moves:[{d:'out',t:'Table names, column counts, first 10 column names'},{d:'no',t:'Any row of data, any value, any password'}],
  never:[`If the AI call fails, Zevra simply shows the first 15 tables in the list`],
  why:`Choosing a cheap, fast model is enough for a list-sorting task, and keeps setup quick and inexpensive.`},
 {id:'s3',t:'A person picks the tables to bring in',from:'A',to:'B',tags:['human'],
  what:`<p>The administrator reviews the suggestions, adds or removes tables, and selects what to analyse. Zevra caps one analysis at 40 tables, enforced on the server, so a single click cannot trigger an unbounded amount of work.</p>`,
  ex:{label:'Example',body:`Selected: purchase_orders, purchase_order_lines, suppliers`},
  never:[`Nothing is analysed until a person asks`],
  why:`People stay in control of what Zevra is allowed to learn about.`},
 {id:'s4',t:'Zevra reads each selected table\'s definition',from:'B',to:'D',tags:['rule','src'],
  what:`<p>For each chosen table Zevra reads its <em>definition</em>: column names, data types, whether a value is required, the names of any enum types, and the table and column comments written by the company's own database team (when they exist).</p>`,
  ex:{label:'What is read',body:`Table: retail_core.purchase_order_lines
  purchase_order_id  uuid        NOT NULL
  product_id         uuid        NOT NULL
  ordered_qty        integer     NOT NULL
  received_qty       integer     NOT NULL
  status             text (enum: po_line_status)`},
  moves:[{d:'in',t:'Column definitions and comments come from your database'}],
  never:[`No rows are read in this step`],
  why:`The company's own comments are the best clue to what a column means, so Zevra reads them whenever they exist.`},
 {id:'s5',t:'AI describes what each table means',from:'B',to:'E',tags:['ai:gpt-4o-mini'],
  what:`<p>Tables are sent four at a time. For each one the AI proposes a human name, a purpose, how it is used day to day, which columns identify a record, which show status, which flag problems, safe filter columns, usage guidance, suggested vocabulary and questions, and which of the pack's concepts the table represents, with a confidence.</p><p>Zevra then <strong>validates</strong> the AI's concept choice: it must be one of the real concepts in the pack, otherwise it is discarded. Java never makes the choice itself.</p>`,
  ex:{label:'Example output (illustrative)',body:`entityName:        Purchase Order Line
purpose:           Each product ordered on a purchase order
statusColumns:     status
identifierColumns: purchase_order_id, product_id
conceptResolution: purchase-order-line
                   confidence HIGH
                   reason: "quantity ordered and received per product per PO"`},
  ai:{model:'gpt-4o-mini',sees:'The table definitions from the previous step, plus the pack\'s concept catalogue (concept names, aliases, descriptions, meanings).',decides:'Names, purpose, column roles, vocabulary, suggested questions and which concept each table is.',cant:'See any row of data, invent a concept that is not in the pack, or save anything on its own: a person still has to approve.'},
  peek:{label:'Show the shape of what OpenAI receives (abridged)',body:`Domain: PLATFORM

Canonical Business Concepts (choose from these):
- purchase-order : Purchase Order (also called: purchase order, po, po header...)
    A procurement commitment from the retailer TO A SUPPLIER ...
- purchase-order-line : Purchase Order Line (also called: po line, order line item)
    One product-level line within a Purchase Order ...
- supplier : Supplier (also called: vendor, manufacturer supplier)
    The external business partner the retailer buys goods FROM ...

Schema: retail_core, Table: purchase_order_lines
Columns:
  - purchase_order_id uuid NOT NULL
  - product_id uuid NOT NULL
  - ordered_qty integer NOT NULL
  - received_qty integer NOT NULL
  - status text (enum: po_line_status) NOT NULL`},
  moves:[{d:'out',t:'Table and column definitions, the database\'s own comments, the pack\'s concept list'},{d:'no',t:'Any row of data'}],
  never:[`If the AI fails for a table, Zevra saves a plain placeholder for it and flags the failure`],
  why:`Batching four tables per call keeps the number of AI calls low while keeping each prompt small enough to be reliable.`},
 {id:'s6',t:'A person reviews and approves the drafts',from:'A',to:'B',tags:['human'],
  what:`<p>The administrator sees the AI's draft for every table: name, purpose, columns, vocabulary, concept. They can edit anything, and each item is only saved if it is <strong>approved</strong>.</p>`,
  never:[`Nothing is saved without approval`],
  why:`AI proposes, a person disposes. This is where a wrong guess is caught for the price of one click.`},
 {id:'s7',t:'Zevra saves the approved objects',from:'B',to:'C',tags:['rule','zdb'],
  what:`<p>For each approved table Zevra stores, in Acme's private room: the <em>data object</em> and its columns with their roles, a version snapshot, the linked <em>business entity</em> (the human-friendly concept the table represents), vocabulary terms the person approved, and the concept assignment.</p>`,
  moves:[{d:'stay',t:'Descriptions and roles are written to Acme\'s room in Zevra\'s database'}],
  never:[`The table itself is not copied: only its description`],
  why:`Keeping meaning in Zevra and data in the company's database means answers are always live.`},
 {id:'s8',t:'Zevra learns the allowed values of category columns',from:'B',to:'D',tags:['rule','src','zdb'],
  what:`<p>For columns that hold categories (a status or type), Zevra learns the <em>legal values</em>, so it can later recognise "TX" as "Texas" or "open" as a set of statuses.</p><ul><li><strong>Enum types</strong> (PostgreSQL): read from the database's own list of enum values.</li><li><strong>Observed values:</strong> for status-like text columns only, Zevra reads up to 26 distinct values. If there are more than 25, it is not a category and nothing is kept.</li></ul><p>Before anything is kept, a fixed filter (no AI) rejects values that look like personal data: emails, SSN-like numbers, long digit strings, invoice-style references, free text and person-name shapes. When unsure it rejects.</p>`,
  ex:{label:'Example',body:`po_line_status  (enum):   pending, partial, received, cancelled
suppliers.status (observed): active, inactive, under_review

suppliers.primary_contact_email -> not sampled
  (identifier/sensitive column, and the PII filter would reject it)`},
  moves:[{d:'in',t:'Up to 26 distinct values of a status-like column come from your database'},{d:'stay',t:'Accepted values are stored in Zevra\'s database'},{d:'out',t:'Later, accepted values are shown to the query-writing AI as "allowed values"'}],
  never:[`Identifier, sensitive and high-variety columns are never sampled`,`Names, emails and free text never become allowed values`],
  why:`Knowing the real spellings of categories lets Zevra write correct filters without guessing, and the strict filter protects personal data.`},
 {id:'s9',t:'Zevra works out how the tables connect',from:'B',to:'D',tags:['rule','src','zdb'],
  what:`<p>Relationships are found <strong>without AI</strong>. First Zevra reads the database's declared foreign keys. If a database declares none (common in warehouses), it matches <code>_id</code> columns to tables with a naming rule and scores its confidence. New links are saved; existing ones are left alone.</p>`,
  ex:{label:'Example',body:`purchase_order_lines.purchase_order_id -> purchase_orders.id   (N:1)
purchase_order_lines.product_id        -> products.id          (N:1)`},
  moves:[{d:'in',t:'Foreign-key definitions come from your database'},{d:'stay',t:'Relationships are saved in Zevra\'s database'}],
  never:[`No AI is involved`,`A guessed link is marked with lower confidence, not treated as fact`],
  why:`Joins are where wrong answers hide. Declared keys are treated as definitive and guesses are labelled as guesses.`},
 {id:'s10',t:'Zevra refreshes its concept index (the vector search)',from:'B',to:'E',tags:['ai:text-embedding-ada-002','vec','zdb'],
  what:`<p>Zevra keeps a searchable fingerprint of each business concept the company uses. For each one it builds a short text (concept name, aliases, description, operational meaning, plus any promoted learned terms) and asks the embedding model to turn it into a list of 1,536 numbers, which are stored in Zevra's own database.</p><p>It only re-embeds a concept whose text has changed. This runs automatically after registration, when a pack is applied or removed, when a learning is promoted, nightly, and when the app starts. There is no manual sync button.</p>`,
  ex:{label:'Text that is embedded (real pack text, shortened)',body:`purchase-order-line — Purchase Order Line (also called: purchase order line,
po line, order line item). One product-level line within a Purchase Order:
the specific product, quantity, and unit cost ordered from the supplier.
Exists only in relation to its parent Purchase Order. Used for line-level
order-fulfillment tracking and product-level procurement spend.
[Business terms learned for this concept: "short shipped" means
received_qty < ordered_qty.]   <- only if a learned term exists (illustrative)`},
  ai:{model:'text-embedding-ada-002 (an embedding model)',sees:'Only the concept text above. No table rows and no company data.',decides:'Nothing. It returns numbers.',cant:'Produce words, or see anything about Acme\'s actual data.'},
  moves:[{d:'out',t:'The concept text only'},{d:'stay',t:'The returned numbers are stored in Zevra\'s database (pgvector)'}],
  never:[`No company data goes to OpenAI in this step`,`Nothing is stored at OpenAI: no file, no vector store`],
  why:`Searching by meaning keeps each later question's AI prompt small, however many concepts a company has, and the search itself runs in Zevra's own database.`},
 {id:'s11',t:'Setup finishes',from:'B',to:'A',tags:['rule','zdb'],
  what:`<p>If the company has no agent yet, Zevra creates a default read-only <strong>Data Analyst</strong> agent. It stores the best three suggested questions and marks onboarding complete. The company can now ask questions.</p><p>Adding a table later (<em>Discover from DB</em>) repeats steps 1 to 10 for just that table.</p>`,
  moves:[{d:'stay',t:'Suggested questions and onboarding status saved in Acme\'s room'}],
  why:`Starting with a few good example questions helps people get value within minutes.`}
]};

})(window.ZG);
