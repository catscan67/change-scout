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

```bash
git clone https://github.com/catscan67/change-scout.git
cd change-scout

# One-time setup: install the pinned OpenAPI linter.
# This is the only time this plugin downloads anything, and you initiate it.
npm ci --ignore-scripts

# Validate the plugin manifest (strict mode fails on unrecognized fields)
claude plugin validate . --strict

# Inspect what it loads
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

### What a good assessment surfaces

The request sounds like adding a card type. The evidence says otherwise, and no single file says any of this — each conclusion requires joining two artifacts:

| Joined from | Conclusion |
|---|---|
| The contract + the retrieval code | The published API has no way to express *which* card; supporting a second one changes the contract, and consumers depend on current behavior |
| The plan resolver + the architecture doc | Plan type is a hardcoded constant, so multi-plan members the architecture describes cannot be represented; and nothing in the code models effective dates, so it cannot say what a request returns either side of the cutover |
| The ownership doc + the orchestration code | Identity validation is owned upstream; that trust boundary constrains which designs are admissible |
| The test suite + the architecture doc | The two highest-risk scenarios this change creates — a second card type, and a member holding both — have no coverage |
| The architecture doc against itself | Its capability table and its membership model disagree; the documentation has drifted from intent |

### Hook demonstration

With a session open in the sample repo, ask Claude to make any edit to
`openapi/card-api.yaml`. The PostToolUse hook lints the contract automatically and reports
failures back into the session. Delete the `title:` line from `info:` and the linter reports the document invalid; make a valid edit and it passes silently. Edit any other file and the hook exits without linting.

## Before and after

Baselines were captured **before any component was written** — five runs of Claude Code without
the plugin, on the same repository, with the same change request, on the same model — so the
comparison is measured rather than asserted.

| | Plain Claude Code (5 runs) | **Change Scout** |
|---|---|---|
| Changed project files during the "assessment" | 3 of 5 runs — 7–9 files each | **Never — the agent has no editing tools** |
| Reported the documentation drift | 0 of 5 | **Yes** |
| Led with the invalidated assumption | 0 of 5 | **Yes** |
| Stopped at decisions owned by someone else | 0 of 5 | **Yes** |
| Output | code, or a long plan | **A concise impact assessment** |

**The honest summary:** unaided Claude Code is strong here — it finds the issues. What it does not
do is report that documentation has drifted from intent, name the assumption the change
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
