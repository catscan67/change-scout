---
name: impact
description: Assess what a proposed change touches, before implementation begins
argument-hint: <the change request, in the words it arrived in>
disable-model-invocation: true
---

Delegate this to the `impact-analyzer` subagent.

Pass it the change request exactly as written below, without rewording, narrowing, or
expanding it. If the request is ambiguous, that ambiguity is itself something the assessment
should surface — do not resolve it on the requester's behalf before handing it over.

The change request:

$ARGUMENTS

## Returning the result

The subagent's report is the response to this command. Return it **verbatim**.

Do not summarize it, restructure it, re-order it, paraphrase it, introduce it, or append
commentary of your own. Section headings, the decision posture, every `[Severity · Evidence
status]` tag, every citation, the decision gates, and the gaps must all reach the user exactly
as the subagent wrote them. The tags and citations are the part that lets a reader judge how
much weight each finding carries; a tidied-up version is a worse document, not a better one.

If the subagent fails, times out, or returns no report, say so plainly and show what you got.
Do not write an assessment of your own to fill the gap, and do not present a partial or
reconstructed version as though it were the subagent's work.
