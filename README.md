# Change Scout

*A change-impact scout for enterprise integration developers.*

A Claude Code plugin that recovers the architectural context around a proposed change **before**
implementation begins. In one sentence: it helps a developer understand what else they might break
before they change the code.

## Who this is for

**Enterprise integration developers at regulated healthcare payers** — the people maintaining services that span multiple systems of record (member enrollment, plan administration, document management). They receive requirements that sound simple and turn out to have architectural implications invisible in the code they first open.

The plugin does not inspect live enterprise systems. It reads the architectural evidence
already in the repository — code, OpenAPI specifications, tests, configuration, integration definitions, documentation — and reconstructs the context around a proposed change.

## What it produces

An **impact assessment**, not a plan and not a diff, written for the person deciding whether the change belongs in this release:

1. **Decision posture** — can work begin, and why or why not
2. **What is changing** — the capability, and the assumption that no longer holds
3. **What decision-makers need to know** — findings tagged `[Severity · Evidence status]`
4. **Decisions and dependencies** — what must be decided, by whom, and what it blocks
5. **Known gaps** — what the repository could not answer, and who to ask

The report is deliberately concise, readable by a business stakeholder, with every conclusion
traceable to repository evidence through line-level citations.

## Install and try it — under five minutes

**Prerequisite:** Node.js 20.19–20.x or 22.12+ (required by the pinned linter). Nothing else — no
accounts, no credentials, no API keys beyond your existing Claude Code authentication.

The `npm ci` step is the one-time install of the pinned OpenAPI linter — the only time this
plugin downloads anything, and you initiate it. Validation is strict: unrecognized manifest
fields fail. The last command shows what the plugin loads and what it costs.

```bash
git clone https://github.com/catscan67/change-scout.git
cd change-scout
npm ci --ignore-scripts
claude plugin validate . --strict
claude --plugin-dir . plugin details change-scout
```

Skipping setup is safe: the hook detects the missing linter and tells you how to install it rather
than fetching anything.

The inventory shows one methodology skill, one agent, one command, and one hook. Change Scout adds
roughly 277 tokens of always-on context; the methodology and agent load only when you invoke an
assessment.

## Demo walkthrough

The repository bundles a fictional payer service, `sample-repo/member-services/`, carrying the
kinds of evidence the plugin is built to read.

**Run the demo from inside the sample repository, not from the plugin root:**

```bash
cd sample-repo/member-services
claude --plugin-dir ../..
```

> **Why the `cd` matters.** The agent analyzes its working directory. Started at the plugin root it would read this README, the skill, and the agent definition — and this README describes what the assessment is supposed to find. The demo would then be measuring reading comprehension rather than architectural analysis. Running from the sample repo keeps the agent's evidence to the repository under analysis.

Then, in the session:

```
/change-scout:impact Starting January 1, 2027, members need to be able to retrieve their new pharmacy ID card through the Member Card API.
```

Use `/change-scout:impact` for the demo. Bare `/impact` also works when no other installed skill or
command claims that name.

### What to look for in the assessment

Change Scout's output varies from run to run. Findings may be combined, separated, or prioritized
differently — don't compare your report line-for-line with an example. Look instead for the
behavior the method is designed to produce:

- **It challenges the existing assumptions.** The current system was designed around one active
  plan and one relevant card per member; the new requirement makes that assumption unsafe, and the
  report should lead with that rather than bury it.
- **It connects evidence across files.** No single file says any of this — the contract, the
  plan-resolution code, the architecture document, the tests, and the ownership rules each hold
  one piece.
- **It separates what the repository establishes from what it can't.** Missing ownership,
  system-of-record, consumer, and date-rule decisions should show up as named gaps — never as
  guesses.
- **It stops at decisions that belong to someone else.** A good assessment ends where a contract
  owner, a business owner, or another team has to decide.
- **It stays an assessment.** The agent is read-only; no project files change while it
  investigates.

Three landmarks from the sample repository, so you can tell the evidence is real:

| Evidence to connect | What it can reveal |
|---|---|
| The API contract + the card retrieval code | The current interface returns one card and gives callers no way to ask for a specific one |
| The architecture document + the implementation | The business allows multiple plans and a plan-year transition that the code doesn't model |
| The ownership rules + the integration docs | Nothing establishes who will own the new pharmacy-card data — which should surface as a gap, not an invented answer |

The wording and grouping of your run won't match another run. That's expected. The repeatable
part is the method: connect the evidence, name the assumption that no longer holds, separate
knowns from unknowns, and stop at the decisions the repository can't make.

### Hook demonstration

With the session still open in the sample repo, paste this — ask Claude rather than editing
the file yourself, because the hook watches Claude's edits:

```
Delete the "title: Member Card API" line from the info block in openapi/card-api.yaml
```

The hook lints the contract immediately after Claude's edit. `title` is required, so validation
fails and the failure goes back to Claude — in our runs it either restored the line on its own or
stopped to ask. A valid edit passes silently, and edits to any other file are ignored. If Claude
leaves the deletion in place, ask it to restore the line before moving on.

## Observed in baseline testing

These are results from the test runs captured while building the plugin — evidence for why it
exists, not acceptance criteria for your run. Wording and grouping vary.

Baselines were captured **before any component was written** — five runs of Claude Code without
the plugin, on the same repository, with the same change request, on the same model — so the
comparison is measured rather than asserted.

| | Plain Claude Code (5 runs) | **Change Scout** |
|---|---|---|
| Changed project files during the "assessment" | 3 of 5 runs — 7–9 files each | **Never — the agent has no editing tools** |
| Reported that the documentation contradicts itself *(the architecture document describes a single-card system and a multi-plan membership at once)* | 0 of 5 | **Yes** |
| Named the assumption the change breaks — first, before the findings | 0 of 5 | **Yes** |
| Stopped at decisions owned by someone else | 0 of 5 | **Yes** |
| Output | code, or a long plan | **A concise impact assessment** |

**The honest summary:** unaided Claude Code is strong here — it finds the issues. What it does not
do is report that the documentation contradicts itself, name the assumption the change
invalidates before listing blockers, or stop at the point where a decision belongs to someone
else. That is what packaging a team's method changes.

## How it works

**AI reasoning where architectural judgment is required; deterministic tooling where rules can be
enforced.** The agent reasons about impact; the hook validates contracts without reasoning. The
implementation is deliberately small:

| Path | What it is | Who reads it |
|---|---|---|
| `skills/enterprise-change-analysis/SKILL.md` | The method — capability, assumptions, contracts, ownership, trust boundaries, dependencies, time and state, test coverage, decision gates. Useful on its own, without the agent | A person, or any agent that preloads it |
| `agents/impact-analyzer.md` | The investigator. Read-only tools, tier-alias model, bounded turns, preloads the skill | Claude Code, when the command delegates |
| `skills/impact/SKILL.md` | The entry point. Delegates, then returns the agent's report verbatim. `disable-model-invocation: true` keeps it yours to trigger — Claude never fires it on its own | You |
| `hooks/hooks.json` | Registers the PostToolUse hook | Claude Code, at startup |
| `scripts/validate-openapi.sh` | Lints an edited OpenAPI contract, using only trusted local inputs | The hook |
| `redocly.yaml` | The plugin's own linter config, forced with `--config` so the analyzed repository cannot supply executable configuration | The linter |
| `sample-repo/member-services/` | A fictional payer service used to demonstrate and test | The agent, during the demo |

## Security and execution

The impact analyzer is **read-only**: its tool grant is `Read`, `Grep`, and `Glob`, with no
editing or shell tools — a capability constraint, not a prompt instruction.

The OpenAPI hook uses a **pinned local validator**. It never downloads software when the hook
runs, and it uses Change Scout's own validator configuration rather than configuration supplied by
the repository being analyzed.

Repository contents the agent reads become Claude model input under your organization's Claude
Code configuration. Change Scout adds no telemetry and contacts no third-party service. For
regulated repositories, use your organization's approved Claude configuration and appropriate
workspace and network controls.

The plugin went through **independent adversarial security review** during development — three
passes with a third-party scanner, each followed by a manual multi-persona review. The first two
passes found real issues in the original hook design, which were fixed before submission; the
final pass, at the shipped commit, found no new problems.

**For the full disclosure — what executes and when, what leaves your machine, containment limits,
the review findings and their fixes — see [SECURITY.md](SECURITY.md).**

## Design decisions

### Why there is no MCP server

Version 1 analyzes evidence inside a repository, which Claude Code's built-in tools already read
well. Adding an MCP server here would add installation burden, a configuration surface, and a
trust surface without adding capability — surface area to check a box.

MCP belongs in the enterprise version, where the genuinely missing evidence lives: Confluence for
architecture decision records, Jira for the change history behind a service, an API catalog for
the consumer registry the repository can only claim to know. Every assessment names those gaps and
routes them to a human — and each named gap is a candidate MCP integration. The gaps report is the
roadmap.

### Why a hook, and what I would change

The agent assesses impact before implementation; the hook gives immediate feedback if Claude later
writes an invalid OpenAPI contract. It is a **feedback loop, not a gate**: it runs after Claude's
edit, so it cannot prevent the change, and it sees only edits Claude makes — not edits made in an
editor, a teammate's push, or a merge. Contract validation a whole team depends on belongs in
repository-level configuration and CI; this does not replace that.

In a production rollout I would keep the agent in the plugin and move contract validation to that
shared layer. With more time I would also explore a hook that validates Change Scout's **own
output** — confirming every required report section, especially Known gaps, is present. That check
is deterministic, and it points at the part of the plugin that is probabilistic.

## Known limitations

- **The repository is the evidence boundary, not the enterprise.** Production consumers,
  release calendars, ownership, and regulatory obligations usually live elsewhere. The
  assessment names these as gaps rather than guessing — but it cannot resolve them.
- **`sample-repo/member-services/` is not a runnable system.** It is evidence for a
  demonstration. `npm test` passes and the contract lints; there is no server.
- **Acme Health Plan does not exist.** The scenario is fictional.
- **The linter's network behavior is filtered, not fenced.** The remote-`$ref` check reads only
  the edited contract. A transitive local reference chain ending at a remote URL would still be
  resolved by the linter. Enforced network denial around the linter process is the only strong
  guarantee, and this plugin does not implement one — it is an environmental control, not a
  property this shell script can provide portably.

## Build your own plugin

**[Read the guide →](https://build-your-first-claude-code-plugin.netlify.app/)** — or open
[build-your-own-plugin.html](build-your-own-plugin.html) in a browser from a clone. GitHub
displays `.html` as source rather than rendering it, so use the link above to actually read it.

It is a one-page guide for anyone who knows how their team makes a decision and wants to package
it up — you decide, Claude builds, you verify. Its worked example is deliberately a *different*
workflow from this plugin, so you can see the pattern rather than copy the instance.
[PLUGIN-TECHNICAL-NOTES.md](PLUGIN-TECHNICAL-NOTES.md) is the guide's companion appendix, with the
worked example's files in full and the safety rules for hooks that run outside tools.

## License

MIT — see [LICENSE](LICENSE).
