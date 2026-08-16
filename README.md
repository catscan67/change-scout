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
| Named the assumption the change breaks — first, before the findings *(one active plan per member, treated as medical — so one card, always)* | 0 of 5 | **Yes** |
| Stopped at decisions owned by someone else | 0 of 5 | **Yes** |
| Output | code, or a long plan | **A concise impact assessment** |

**The honest summary:** unaided Claude Code is strong here — it finds the issues. What it does not
do is report that the documentation contradicts itself, name the assumption the change
invalidates before listing blockers, or stop at the point where a decision belongs to someone
else. That is what packaging a team's method changes.

## How it works

Change Scout uses the agent for work that requires judgment, and the hook for something with a
clear pass/fail answer. The plugin itself is pretty small:

| Path | What it does | Used by |
|---|---|---|
| `skills/enterprise-change-analysis/SKILL.md` | **The method.** Defines what to investigate, what questions to ask, and what the final impact assessment should contain | Impact Analyzer |
| `agents/impact-analyzer.md` | **The specialist.** Searches and reads the repository using the method above. It is read-only | Impact command |
| `skills/impact/SKILL.md` | **The command.** Starts the Impact Analyzer and returns its report. It only runs when you invoke it | You |
| `hooks/hooks.json` | **The trigger.** Tells Claude Code when to run the OpenAPI check | Claude Code |
| `scripts/validate-openapi.sh` | **The check.** Validates an OpenAPI contract after Claude edits it | Hook |
| `redocly.yaml` | **The validator settings.** Makes sure the validator uses Change Scout's configuration rather than configuration from the repository being analyzed | Validator |

The repository also includes `sample-repo/member-services/`, a fictional payer service used for
the demo and testing.

## Security and execution

The Impact Analyzer is **read-only**. It can read and search files in the repository, but I did
not give it tools that allow it to edit files or run shell commands.

The OpenAPI hook uses a **specific version of its validator** that is installed with the plugin.
It doesn't download anything when the hook runs, and it uses its own configuration rather than
configuration it finds in the repository it's checking.

One thing to be aware of: the files the agent reads are sent to Claude for analysis. Change Scout
itself doesn't add any telemetry or send data to another third-party service. If you're working
with regulated or sensitive data, use the Claude Code configuration and security controls approved
by your organization.

I also had the plugin **independently reviewed for security** several times while I was building
it. Those reviews found issues in the original hook design that I wouldn't have caught myself. I
worked through the findings, changed the design, and ran the reviews again before submission.

For the technical details, including what the reviews found and what changed, see
[SECURITY.md](SECURITY.md).

## Design decisions

### Why there is no MCP server

I didn't include an MCP server because Change Scout doesn't need one for what it does today. The
first version analyzes information that's already in the repository, and Claude Code already has
the tools it needs to read and search that information. Adding MCP wouldn't make the plugin more
useful, so I left it out.

In a real enterprise environment, that would probably change. A lot of the information Change
Scout can't find in the repository lives somewhere else — in Jira, Confluence, an API catalog, or
other enterprise systems. Those are the places where I would look at adding MCP next. The
Known gaps section helps identify which outside sources would actually be useful to connect.

### Why a hook, and what I would change

The agent does the impact assessment before implementation starts. The hook does something much
simpler: if Claude changes an OpenAPI contract, it checks whether the contract is still valid.

The hook runs after Claude makes the change, so it can't prevent the edit. It also only sees
changes Claude makes — not something a developer changes in their own editor, a teammate pushes,
or a merge to main. If contract validation is something the whole team depends on, it belongs in
the repository and CI, where it applies to everyone.

With more time, I'd also add a hook that's more directly connected to Change Scout itself: check
the report the agent produces and make sure every required section is there, especially Known
gaps. Whether a required section is present is a clear yes/no check, which is exactly the kind of
thing a hook is good at.

## Known limitations

- **Change Scout only knows what it can find in the repository.** Information about production
  consumers, release schedules, ownership, or regulatory requirements may live somewhere else.
  Change Scout reports those as gaps instead of guessing.
- **The sample repository is just a demo.** `sample-repo/member-services/` contains enough code,
  documentation, contracts, and tests to demonstrate Change Scout, but it isn't a working
  application.
- **Acme Health Plan is fictional.**
- **The OpenAPI validator isn't completely isolated from the network.** Change Scout blocks
  remote references it can see in the contract being edited, but a reference to another local
  file could eventually lead to a remote URL. If complete network isolation is required, the
  validator needs to run in an environment where network access is blocked. See
  [SECURITY.md](SECURITY.md) for the details.

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
