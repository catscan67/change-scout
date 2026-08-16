---
name: enterprise-change-analysis
description: Method for assessing what a proposed change touches before any code is written — the assumptions it invalidates, the contracts and ownership boundaries it crosses, what the repository cannot answer, and the order the work has to happen in. Use when a change request arrives for a service that spans multiple systems of record, when deciding whether a change is safe to start, or when an impact assessment is wanted instead of an implementation.
---

# Enterprise Change Analysis

A repeatable way to work out what a change actually touches, starting from the evidence a
repository already contains: code, published contracts, tests, configuration, integration
definitions, and documentation.

The method exists because requirements arrive sized by their business description, not by
their architectural reach. "Add a field," "support a second type," "let users retrieve X"
routinely turn out to invalidate something the system was built around. That is discoverable
before implementation, from evidence already on disk.

**The repository is where the evidence starts, not where the enterprise ends.** Production
consumers, current ownership, release calendars, regulatory obligations, and operational
history usually live outside it. Those are not blanks to fill with something plausible — they
are gaps to name and route to a human.

## What this produces

An assessment, not a plan and not a diff. Its reader is deciding **whether and when** the
change happens and **who else has to agree** — not yet how to build it.

If the output could be handed straight to a developer as build instructions, the method was
applied wrongly. Stop at the point where a human has to make a call.

---

## Step 1 — Restate the change as a capability

Write one sentence: *what will the system be able to do afterwards that it cannot do now?*

Strip the implementation language out of the request. "Add a parameter" is a proposed
solution; "return a different thing depending on context" is the capability. Analyze the
capability, because the proposed solution is often the first thing the evidence contradicts.

## Step 2 — Name the assumptions the change invalidates

**This is the step that changes the answer, and the one most easily skipped.**

Systems encode assumptions that were true when they were built and were never written down,
precisely because nothing contradicted them. Look for the shape of the thing being retrieved,
stored, or decided:

- What does the code assume there is exactly **one** of?
- What does it assume **never changes**, or never varies by caller, context, or date?
- What does it assume it can **derive** rather than be told?

A hardcoded constant, a `[0]` index into a collection, a single-valued return type, or a
lookup keyed on fewer inputs than the business now distinguishes — each is an assumption
written in code rather than prose.

Name the **primary** invalidated assumption: the one that best explains the architectural
reach of the change. Then name any **secondary** assumptions carrying independent risk. They
tend to fall into recognizable kinds — cardinality (one becomes many), temporality (current
state becomes effective-dated), authority (this service no longer decides), identity
(behavior varies by actor or tenant), lifecycle (immutable becomes mutable).

State each assumption, then state what replaces it. If the inputs required to get a correct
answer have changed, **the change is to the model, not to the component** — and the findings
below are evidence for that, not separate problems.

**If no invalidated assumption is evidenced, say so.** Do not manufacture one. Some changes
really are local, and a method built to find invalidated assumptions will invent one if you
let it.

Lead the assessment with this. A list of blockers describes a build; a named invalidated
assumption describes an architecture.

## Step 3 — Work the lenses

Each lens is a question answered from evidence. Cite the file and, where you can, the symbol
or line — a filename is a pointer, a line is proof. Apply a lens where the capability or the
available evidence makes it relevant; do not manufacture an `Unknown` for every lens that does
not apply. This is a method, not a questionnaire.

Tag every material finding with its evidence status:

- **Confirmed** — directly demonstrated by executable or declarative evidence, or corroborated
  by independent sources
- **Inferred** — reasoned from cited evidence, but stated directly nowhere
- **Claimed** — asserted by documentation, comments, naming, or metadata, uncorroborated
- **Unknown** — material to the decision, not determinable from available evidence

Two ways this goes wrong. **Repetition is not corroboration** — a claim repeated across several
documents is still `Claimed`; only code, tests, or configuration can promote it. And do not
retreat to `Unknown` where the evidence supports a bounded inference: state the inference and
what bounds it.

`Unknown` belongs under *Gaps*, not *Findings*. A finding says what is known and what follows
from it; a gap says what could not be established and who can establish it.

The status is not decoration. `Claimed` and `Confirmed` carry different weight in a decision,
and collapsing them is how documentation drift gets laundered into fact.

**Contracts.** What is published, and does it have room to express the new distinction? A
contract that never mentions the new concept is not wrong, it is *insufficient*. Insufficiency
creates compatibility risk rather than an automatic breaking change: establish whether the
distinction can be introduced additively, needs versioning or consumer migration, or
unavoidably changes behavior consumers already depend on. Name the consumers you can
evidence, and treat any prose list of them as a claim, not a registry.

**Data ownership.** Which system of record owns each piece of data the change touches? What
is this service permitted to do with it — consume, cache, persist, decide? Treat movement or
duplication of decision authority as a *suspected* boundary violation until someone empowered
to move it has said so; the assessment surfaces that decision rather than prejudging it.
Where data is regulated, ask which retention, audit, or disposition obligations travel with
it.

Ownership is not one thing, and conflating its kinds produces confident, wrong conclusions.
Distinguish who owns the **code** (the team responsible for a service's implementation), the
**data** (the system or team authoritative for the records themselves), the **business rule**
(the role authorized to define how a decision is made), and the **platform** (the team
operating an upstream or downstream dependency). Consuming another team's data store does not
make them the owner of your query design, and calling their API does not make them accountable
for your behavior.

Never infer ownership from a dependency relationship alone. Where the evidence establishes
only that a dependency exists, the ownership claim is `Inferred` at best and often `Unknown` —
tag it honestly rather than promoting a guess to a fact by writing it confidently.

**Security and trust boundaries.** Where is identity established, and what runs downstream of
it assuming that already happened? A change that adds a lookup, a validation, or a persistence
step on the wrong side of that line breaks a property the design depends on. Ask the same
question of authorization, tenant and record isolation, secret handling, data exposed in
responses and logs, and what must remain auditable.

**Dependencies.** What calls this, and what does it call? Which of those are owned by other
teams, on other release schedules? Anything requiring a change on both sides is a scheduling
constraint, not just a technical one.

**Time and state.** Is the change effective-dated? If so, can the system currently represent
that? Ask what a request returns the day before and the day after; whether records created
under the old rules stay reachable under the new ones; whether both models must coexist for a
period; and whether any step is irreversible. Systems built when only one answer was ever
correct frequently have no way to express *which* answer, or *as of when*.

**Test coverage.** Which of the scenarios this change creates are covered today? A passing
suite is evidence only for the behaviors it exercises — it says nothing about scenarios the
change introduces. Absent coverage on the highest-risk paths is a finding in its own right.

## Step 4 — Decision gates and dependency order

Give the reader the order, not the task list: what must be decided or confirmed by a named
human before anything starts, what can proceed without breaking current consumers, what needs
another team's schedule, and what cannot begin until an answer arrives.

Do not prescribe implementation tasks, code changes, or estimates. An order that violates an
ownership or trust boundary is not a valid order, however efficient it looks.

This is not a ban on recommending. Where the evidence establishes that only one class of
option satisfies a contract, a boundary, or a governance rule, say so and cite the constraint
that makes it so — withholding that is not neutrality, it is omission. What you must not do is
convert it into a decision you were not given. Naming the only option class the evidence
permits is guidance; choosing which mechanism inside that class ships belongs to whoever owns
it. Mark the difference explicitly.

---

## Two rules that change the output

**Absence of evidence is itself a finding.** If the evidence cannot answer something, that is
a result, not a blank to fill. Never substitute a plausible value for a missing one — not a
field name, not an identifier, not a status value, not a consumer list. An invented value that
looks right is worse than an acknowledged gap, because it stops anyone from asking.

Report each gap as: what could not be determined, why it matters, what a wrong assumption
would cost, and **who to ask**.

**Documents are claims, not truth.** Documentation records what was intended when it was
written. Check each claim against the code and against the rest of the document set.

Where a document and the code disagree, or a document contradicts itself, report the drift as
a finding. Do not quietly adopt the document's version, and do not quietly correct it — the
disagreement is evidence about how the system is governed, and erasing it destroys that
evidence. Note which of the two you trusted and why.

---

## The report

**Write for a business decision-maker, not for an architect.** The reader decides whether the
work starts, what it costs, and who else must agree. They may not know the repository, the
service boundaries, the interface vocabulary, or the language any of it is written in — and
they should not have to in order to decide.

- Lead with capability, consequence, ownership, and the decision required.
- Plain language in every heading and every conclusion. Define an acronym on first use.
- Introduce a technical term only where it changes the decision.
- Keep file names, line numbers, and implementation detail in the citations — not in the
  sentence carrying the meaning.

Every material finding answers three questions, in this order: **what is it**, in plain
language; **why does it matter** to customers, operations, compliance, cost, timing, or
delivery risk; and **what follows** — which decision, whose, and what it blocks.

A finding reading *"the published interface has no parameter for the new distinction"* tells
an architect something and a business reader nothing. The same finding as *"the system cannot
tell which record the caller wants, so it can return the wrong one — agreeing that selection
rule is X's decision, and nothing downstream can start until it is made"* informs both, and
loses no precision because the technical statement is still there in the citation.

**Self-test before finishing.** Cover the citations and read it again. Can a business owner
still say what cannot safely begin, why, who must decide, and what it would cost to guess
wrong? If not, this is an engineering assessment wearing an executive heading.

The structure:

1. **Decision posture** — one sentence: can work begin, and why or why not.
2. **What is changing** — the new capability in plain language, and the assumption that no
   longer holds. Primary assumption first, then any material secondary ones — or the explicit
   statement that none was evidenced and the change appears locally bounded.
3. **What decision-makers need to know** — Blocking and Material findings, written as business
   consequences, each keeping its severity and evidence status and citing its evidence at line
   level. Severity is **Blocking** (unsafe to begin before it is resolved), **Material**
   (affects architecture, compatibility, compliance, or coordination), or **Advisory**. If a
   finding merely restates one document, it is not a finding.
4. **Decisions and dependencies** — the decision required, the accountable business or
   technical role, and what it blocks.
5. **Known gaps** — a bulleted list, one gap per bullet: what remains unknown, what guessing
   wrong would cost, and who can answer. Never run the gaps together into a paragraph.

Findings are conclusions, not build steps. "The contract cannot express the distinction and
three consumers depend on current behavior" is a finding. "Add a type parameter to the
endpoint" is a build step, and it belongs to whoever owns that decision — not to this
assessment.
