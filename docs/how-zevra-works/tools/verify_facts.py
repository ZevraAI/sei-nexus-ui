#!/usr/bin/env python3
"""Checks that the numbers and names the guide states still match the code.

  python docs/how-zevra-works/tools/verify_facts.py      (from the sei-nexus-ui repo root)

Exit code 0 = every checked fact matches. Exit code 1 = the guide has drifted from the code; the
output says which file in docs/how-zevra-works/src to fix. This only checks the facts listed below
(models, limits, thresholds, counts). It cannot tell you that a new feature or a changed flow is
missing from the guide: that part is a human review (see ../README.md).
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GUIDE = os.path.dirname(HERE)
# The code this guide describes lives in the BACKEND repo (sei-nexus-ai), a sibling of this one. Override with
# ZEVRA_BACKEND=/path/to/sei-nexus-ai if your checkouts are laid out differently.
REPO = os.path.abspath(os.environ.get("ZEVRA_BACKEND") or os.path.join(GUIDE, "..", "..", "..", "sei-nexus-ai"))
if not os.path.isdir(os.path.join(REPO, "src", "main", "java")):
    sys.exit("verify_facts: backend repo not found at %s (set ZEVRA_BACKEND)" % REPO)
JAVA = os.path.join(REPO, "src", "main", "java")
RES = os.path.join(REPO, "src", "main", "resources")

failures, warnings, checked = [], [], 0


def read(path):
    with io.open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def find(name):
    for base, _, files in os.walk(JAVA):
        if name in files:
            return os.path.join(base, name)
    sys.exit("verify_facts: cannot find %s under %s (was it renamed? update tools/verify_facts.py)" % (name, JAVA))


def src(name):
    return read(os.path.join(GUIDE, "src", name))


G = {n: src(n) for n in ("data1.js", "data2.js", "data3.js", "engine.js", "body.html", "head.html")}
ALL = "\n".join(G.values())
YML = read(os.path.join(RES, "application.yml"))


def grab(java_name, pattern, group=1):
    m = re.search(pattern, read(find(java_name)))
    if not m:
        sys.exit("verify_facts: pattern %r no longer matches in %s: the code changed shape; update the check" % (pattern, java_name))
    return m.group(group)


def expect(label, where, tokens):
    """Every token must appear in the named guide source file."""
    global checked
    for t in tokens:
        checked += 1
        if t not in G[where]:
            failures.append("%s: the code says %s, but %s does not contain %r" % (label, label.split(": ")[-1], where, t))


def num(s):  # "0.80" -> ".8"  (engine.js writes thresholds that way)
    return ("%g" % float(s)).lstrip("0") or "0"


# ---------------------------------------------------------------- AI models (guide table vs code defaults)
def model_default(prop):
    m = re.search(r"\b%s:\s*\$\{[A-Z0-9_]+:([^}]*)\}" % re.escape(prop), YML)
    if m:
        return m.group(1)
    for base, _, files in os.walk(JAVA):
        for f in files:
            if f.endswith(".java"):
                m = re.search(r"\$\{nexus\.openai\.%s:([^}]+)\}" % re.escape(prop), read(os.path.join(base, f)))
                if m:
                    return m.group(1)
    sys.exit("verify_facts: no default found for nexus.openai.%s" % prop)


ROLE = {  # AI-use row number in data1.js -> the nexus.openai.<property> that drives it
    1: "onboarding-model", 2: "onboarding-model", 3: "embedding-model", 4: "embedding-model",
    5: "routing-model", 6: "routing-model", 7: "embedding-model", 8: "stage1-model",
    9: "memory-selection-model", 10: "planner-model", 11: "evaluator-model", 12: "composer-model",
    13: "composer-model", 14: "correction-detector-model", 15: "chat-model", 16: "chat-model",
    17: "composer-model", 18: "composer-model", 19: "term-extractor-model", 20: "chat-model"}
rows = re.findall(r"\{n:(\d+),area:'[^']*',what:'(?:[^'\\]|\\.)*',model:'([^']*)'", G["data1.js"])
if len(rows) < 20:
    sys.exit("verify_facts: could not parse the AI-use table in data1.js")
for n, model in rows:
    n = int(n)
    checked += 1
    if n not in ROLE:
        warnings.append("AI use #%d has no entry in ROLE (tools/verify_facts.py): add the property that drives its model" % n)
        continue
    want = model_default(ROLE[n])
    if want != model:
        failures.append("AI use #%d (data1.js) lists model %s but %s defaults to %s in code" % (n, model, ROLE[n], want))

# ---------------------------------------------------------------- learning (flow 5 and its simulator)
L = "SemanticLearningService.java"
pu, pc = grab(L, r"PROMOTE_MIN_USES\s*=\s*(\d+)"), grab(L, r"PROMOTE_MIN_CONFIDENCE\s*=\s*([\d.]+)")
gu, gc = grab(L, r"PURGE_MIN_USES\s*=\s*(\d+)"), grab(L, r"PURGE_MAX_CONFIDENCE\s*=\s*([\d.]+)")
expect("Learning: promote uses = %s" % pu, "data3.js", ["at least <strong>%s</strong> times" % pu])
expect("Learning: promote uses = %s" % pu, "engine.js", ["st.u>=%s&&st.c>=%s" % (pu, num(pc))])
expect("Learning: promote confidence = %s" % pc, "data3.js", ["confidence of at least <strong>%s</strong>" % pc])
expect("Learning: purge uses = %s" % gu, "data3.js", ["at least <strong>%s</strong> uses" % gu])
expect("Learning: purge confidence = %s" % gc, "engine.js", ["st.u>=%s&&st.c<%s" % (gu, num(gc))])
hh, mm = re.search(r'cron = "0 (\d+) (\d+) \* \* \*"', read(find(L))).groups()
expect("Learning: nightly job = %s:%s" % (mm.zfill(2), hh.zfill(2)), "data3.js", ["%s:%s" % (mm.zfill(2), hh.zfill(2))])
R = "LearnedMappingRepository.java"
up = grab(R, r"Math\.min\(e\.confidence\(\) \+ ([\d.]+)")
pen = grab(R, r"GREATEST\(confidence - ([\d.]+)")
rei = grab(R, r"LEAST\(confidence \+ ([\d.]+)")
expect("Learning: repeat = +%s" % up, "engine.js", ["st.c+%s" % num(up)])
expect("Learning: thumbs-up = +%s" % rei, "engine.js", ["st.c+%s" % num(rei)])
expect("Learning: correction = -%s" % pen, "engine.js", ["st.c-%s" % num(pen)])
expect("Learning: correction = -%s" % pen, "data3.js", ["<strong>%s</strong>" % pen])
expect("Learning: thumbs-up = +%s" % rei, "data3.js", ["<strong>+%s</strong>" % rei])
expect("Learning: repeat = +%s" % up, "data3.js", ["<strong>+%s</strong>" % up])
tc = grab("TeachingService.java", r"EXPLICIT_TEACHING_INITIAL_CONFIDENCE\s*=\s*([\d.]+)")
expect("Learning: taught starts at %s" % tc, "data3.js", ["<strong>%s</strong>" % ("%.2f" % float(tc))])

# ---------------------------------------------------------------- the question pipeline
ms = grab("ReasoningEngine.java", r"MAX_STEPS\s*=\s*(\d+)")
fr = grab("ReasoningEngine.java", r"MAX_FAILED_REPLANS\s*=\s*(\d+)")
expect("Chat: loop limit = %s steps" % ms, "data2.js", ["up to <strong>%s steps</strong>" % ms])
expect("Chat: self-corrections = %s" % fr, "data2.js", ["at most twice"] if fr == "2" else ["MISSING-UPDATE-TOKEN"])
mc = grab("ZevraAgentRouter.java", r"MIN_CONFIDENCE\s*=\s*([\d.]+)")
expect("Agents: router confidence = %s" % mc, "data2.js", ["%s confidence" % mc])
expect("Agents: router confidence = %s" % mc, "data3.js", ["%s confidence" % mc])
hk = grab("AgentRunner.java", r"HISTORY_KEEP_PAIRS\s*=\s*(\d+)")
WORDS = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}
expect("Agents: last %s tool exchanges" % hk, "data3.js", ["last %s tool" % WORDS.get(hk, hk)])
expect("Agents: last %s tool exchanges" % hk, "data1.js", ["last %s tool" % WORDS.get(hk, hk)])
cap = grab("MorningBriefService.java", r"Math\.min\(agent\.maxIterations\(\), (\d+)\)")
expect("Brief: agents capped at %s steps" % cap, "data3.js", ["capped at %s steps" % cap])
tk = re.search(r"top-k:\s*\$\{[A-Z_]+:(\d+)\}", YML).group(1)
expect("Concepts: candidates shown = %s" % tk, "data2.js", ["%s business concepts" % tk, "20 candidate" if tk == "20" else "MISSING-UPDATE-TOKEN"])
expect("Concepts: reconsideration shows %d" % (int(tk) * 2), "data2.js", ["%d candidates" % (int(tk) * 2)])
mem_k = re.search(r"retrieval-top-k:\s*(\d+)", YML).group(1)
expect("Documents: pieces kept = %s" % mem_k, "data2.js", ["six closest"] if mem_k == "6" else ["MISSING-UPDATE-TOKEN"])
chunk = re.search(r"chunk-target-words:\s*(\d+)", YML).group(1)
expect("Documents: chunk = %s words" % chunk, "data1.js", ["%s words" % chunk])
blr = grab("BusinessLanguageResolver.java", r"nexus\.blr\.max-resolutions:(\d+)")
ng = grab("BusinessLanguageResolver.java", r"MAX_NGRAM\s*=\s*(\d+)")
expect("Words: at most %s matches" % blr, "data2.js", ["keeps at most %s matches" % blr])
expect("Words: phrases of up to %s words" % ng, "data2.js", ["up to three words"] if ng == "3" else ["MISSING-UPDATE-TOKEN"])

# ---------------------------------------------------------------- safety checks
Q = "QueryGovernanceService.java"
joins = grab(Q, r"max-joins:(\d+)")
defrow = grab(Q, r"default-row-limit:(\d+)")
maxrow = grab(Q, r"max-row-limit:(\d+)")
tmo = (grab(Q, r"point-lookup-timeout-seconds:(\d+)"), grab(Q, r"sync-timeout-seconds:(\d+)"), grab(Q, r"async-timeout-seconds:(\d+)"))
caps = re.findall(r"Math\.min\((\d+), maxRowLimit\)", read(find(Q)))
expect("Safety: at most %s joins" % joins, "data3.js", ["At most %s joins" % joins])
expect("Safety: at most %s joins" % joins, "data2.js", ["At most %s joins" % joins])
expect("Safety: row limits", "data3.js", ["%s for a single-record lookup" % caps[0], "%s for lists and joins" % defrow,
                                         "%s for totals and counts" % caps[1], "never above %s" % maxrow])
expect("Safety: time limits %s" % ", ".join(tmo), "data3.js", ["%s, %s or %s seconds" % tmo])
bad = re.search(r"DANGEROUS_KEYWORDS\s*=\s*\{([^}]*)\}", read(find("SqlSafetyService.java"))).group(1)
for kw in re.findall(r'"([A-Z]+)"', bad):
    expect("Safety: write keyword %s is rejected" % kw, "data3.js", [kw])
wi = re.search(r'matches\("\.\*\\\\b\(([A-Z|]+)\)\\\\b\.\*"\)', read(find("ChatService.java")))
for w in (wi.group(1).split("|") if wi else []):
    expect("Limits: write-word check includes %s" % w.lower(), "data3.js", [w.lower()])
if not wi:
    warnings.append("could not parse isWriteIntent in ChatService.java: re-check the 'crude word check' limit by hand")
expect("Anomalies: thresholds", "data3.js", ["1.5 standard deviations", "20% off"])
az = read(find("AnomalyDetector.java"))
if not re.search(r"zScore > 1\.5 \|\| deviationPct > 20", az) or '"CRITICAL" : zScore > 2 ? "HIGH" : zScore > 1.5' not in az.replace("\n", " "):
    failures.append("Anomalies: thresholds in AnomalyDetector.java changed; update the Alerts text in data3.js")

# ---------------------------------------------------------------- discovery and packs
obs = re.search(r"observed-domain-max-values:(\d+)", read(find("EnterpriseMapService.java"))).group(1)
expect("Discovery: %s observed values" % obs, "data1.js", ["more than %s" % obs, "up to %d distinct" % (int(obs) + 1)])
bs = re.search(r"nexus\.onboarding\.batch-size:(\d+)", read(find("OnboardingService.java"))).group(1)
expect("Discovery: %s tables per call" % bs, "data1.js", ["%s tables per call" % bs, "four at a time" if bs == "4" else "MISSING-UPDATE-TOKEN"])
mx = grab("BusinessObjectAnalysisContract.java", r"MAX_SELECTED_TABLES\s*=\s*(\d+)")
expect("Discovery: max %s tables" % mx, "data1.js", ["%s tables" % mx])
packs = sorted(f for f in os.listdir(os.path.join(RES, "industry-packs")) if f.endswith(".json"))
names = [json.loads(read(os.path.join(RES, "industry-packs", f)))["display_name"].replace("&", "&amp;") for f in packs]
for nme in names:
    expect("Packs: %s exists" % nme, "data1.js", [nme])
retail = json.loads(read(os.path.join(RES, "industry-packs", "retail-v1.json")))
expect("Packs: retail has %d concepts" % len(retail["entities"]), "data1.js", ["has %d" % len(retail["entities"])])
expect("Packs: retail has %d concepts" % len(retail["entities"]), "body.html", ["%d business concepts" % len(retail["entities"])])

# ---------------------------------------------------------------- schedules
for fname, mark, token in (("ScheduledReportService.java", "60_000", "Every minute"), ("MorningBriefScheduler.java", "60_000", "Every minute"),
                           ("BaselineService.java", "3_600_000", "Every hour")):
    if mark not in read(find(fname)):
        failures.append("Schedule in %s is no longer %s: update the %r wording in data3.js" % (fname, mark, token))
    else:
        expect("Schedule: %s" % token, "data3.js", [token])

# ---------------------------------------------------------------- report
print("verify_facts: %d facts checked against the code" % checked)
for w in warnings:
    print("  WARN  " + w)
for f in failures:
    print("  DRIFT " + f)
if failures:
    print("\nThe guide no longer matches the code. Fix docs/how-zevra-works/src/* (see README), rebuild, re-run.")
    sys.exit(1)
print("OK: no drift in the checked facts.")
