# Build your own Claude Code plugin

For an engineer who has seen Change Impact Scout and wants one for a *different* workflow —
release readiness, incident handoff, CVE triage, data-contract review, whatever your team
argues about on Fridays. This is not documentation for that plugin. It's the path to yours.

## Start with four questions, not with file formats

**1. What judgment does your team make repeatedly, and inconsistently?**
Not a task — a *judgment*. "Is this safe to release?" is a judgment. "Run the tests" is a task.
If two competent engineers reach different answers on the same evidence, you've found it.

**2. What evidence already exists that informs that judgment?**
Code, contracts, tests, config, runbooks, dashboards, docs. Be honest about what's *not*
there — that becomes the most valuable part of your output.

**3. Which parts need reasoning, and which are rules a script can check?**
"Does this schema change break consumers?" needs reasoning. "Does this YAML parse?" does not.
Sorting these two is the whole design.

**4. Who reads the result, and what do they need in order to decide?**
An engineer picking up a ticket needs something different from a release manager deciding
whether to ship. Write for the person who acts on it.

## What those answers become

| Your answer | Becomes | Why there |
|---|---|---|
| The repeatable method (Q1 + Q2) | `skills/<method>/SKILL.md` | Loads only when used. Useful to a human on its own |
| The investigation (Q2) | `agents/<worker>.md` | Own context window; returns a conclusion, not a transcript |
| The deterministic rules (Q3) | `hooks/hooks.json` + `scripts/` | Runs for zero model tokens; can't be argued with |
| The output contract (Q4) | Required sections in the agent | Knowing a format and being held to it are different |
| The entry point | `skills/<name>/SKILL.md` | What you type |

## Skeleton

```
your-plugin/
├── .claude-plugin/plugin.json     ← ONLY this file goes here
├── skills/
│   ├── go-nogo/SKILL.md           ← entry point: /your-plugin:go-nogo
│   └── release-method/SKILL.md    ← the method
├── agents/release-analyzer.md
├── hooks/hooks.json
└── scripts/check-migrations.sh
```

Component directories sit at plugin **root**, never inside `.claude-plugin/`. This trips
almost everyone once.

Agent frontmatter, where the important decisions live:

```yaml
---
name: release-analyzer
description: When Claude should delegate to this
tools: Read, Grep, Glob      # read-only because of the grant, not the prompt
skills: [release-method]     # full skill text injected at startup
model: sonnet                # tier alias — survives model turnover
maxTurns: 25                 # bounded cost
---
```

Entry point frontmatter:

```yaml
---
name: go-nogo
description: Assess release readiness before the go/no-go call
disable-model-invocation: true   # only you trigger it, never Claude
---
```

Hook registration — **note the quotes**:

```json
{ "hooks": { "PostToolUse": [ { "matcher": "Write|Edit", "hooks": [
  { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/check-migrations.sh\"" }
] } ] } }
```

Prove it loads before you build anything else:

```bash
claude plugin validate . --strict
claude --plugin-dir . plugin details your-plugin    # shows components and token cost
```

## What I got wrong, so you don't have to

**Measure a baseline before you build.** I ran my change request five times with no plugin
first. Three times Claude Code just started editing files; twice in plan mode it produced a
genuinely good implementation plan. That killed my original pitch — plain Claude Code already
found the issues. What it never did was report that a document contradicted itself, or stop and
say a decision belonged to someone else. **That** became the plugin. Without the baseline I'd
have shipped a confident, false claim.

**Read-only must be a capability, not an instruction.** Grant `Read, Grep, Glob` and omit
`Bash` — a shell that can read files can also write them. Verify by running with permissions
bypassed and confirming nothing changed.

**Keep the expected answers out of your test fixture.** If the conclusion is written anywhere
in the repo you're testing against, you're measuring retrieval, not reasoning.

**A `PostToolUse` hook validates *after* the edit.** It doesn't block it. It hands the failure
back so the model fixes it in the same turn. Design around what it actually does.

**Quote `${CLAUDE_PLUGIN_ROOT}`.** An unquoted path containing a space made my hook exit 0
while doing nothing — a validation that silently passes is worse than one that's missing.

**Don't let a hook fetch code.** Mine ran `npx <linter>` on every edit, which downloaded and
executed whatever version was current — remote code execution on file save. Pin an exact
version, install it deliberately, run the local binary, fail loudly if it's absent. Then check
what that binary *reads*: mine loaded config from the repository under analysis, which could
execute JavaScript.

**Add MCP when your own output asks for it.** Not to check a box. My gaps section names
questions a Jira, Confluence, or API-gateway server already knows the answer to — that's the
integration roadmap, and it arrived from evidence rather than a feature list.

## Your first plugin, in about twenty minutes

1. Answer the four questions in writing. Ten minutes, and the rest is typing.
2. Scaffold the manifest and one skill. Run `validate --strict`.
3. Run your real workflow against a real repo **without** the plugin. Save it.
4. Write the method skill. Run it again. Is it better? If not, the method is the problem.
5. Add the agent with a read-only tool grant and a `maxTurns` ceiling.
6. Add a hook only where a rule is genuinely deterministic.
7. Re-run several times. Consistency is the bar; one good run is luck.
