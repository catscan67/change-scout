# Data Ownership and Service Boundaries

This document records which system owns which data, and what Member Services is
permitted to do with it. Ownership questions are settled here, not in code review.

## Ownership

| Data | System of record | Member Services' role |
|---|---|---|
| Member identity (demographics, member ID) | Enrollment System | Consume only |
| Enrollment, coverage, plan assignment | Enrollment System | Consume only |
| Member documents (ID cards, EOBs, letters) | Nuxeo | Consume only |

## Boundary rules

1. **Member identity validation is owned by the Enrollment System.** The Enrollment
   System integration is the only component permitted to determine whether a member
   identifier is valid and whether the member is eligible. Member Services does not
   implement its own identity checks and does not cache identity decisions.

2. **Member Services is an orchestration layer and does not persist member
   documents.** Documents are retrieved from Nuxeo at request time and returned to
   the caller. Member Services has no document store of its own, and no service
   within it may write to one.

3. **Downstream services trust the member context they are given.** Services beneath
   the entry point operate on a member identifier that has already been established
   by the layer above them.

## Why these rules exist

Acme is a regulated payer. Member identity and eligibility determinations are
auditable events, and the audit record is maintained by the Enrollment System. A
second component making the same determination produces a second, unreconciled
answer — which is a finding in an audit whether or not the two answers agree.

Document retention and disposition schedules are likewise administered in Nuxeo.
A copy of a member document held anywhere else falls outside that schedule.

## Changing these rules

Boundary changes require sign-off from the Member Experience Platform team and from
Privacy Office. Contact: `member-platform@acme-health.example`.
