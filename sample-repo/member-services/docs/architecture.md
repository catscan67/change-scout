# Member Services — Architecture Overview

**Owner:** Member Experience Platform team
**Last reviewed:** March 2026

## Purpose

Member Services exposes member-facing read APIs over Acme Health Plan's systems of
record. It is an orchestration layer: it holds no member data of its own, and every
response it returns is assembled from an upstream system at request time.

## Systems of record

| Domain | System of record | Accessed via |
|---|---|---|
| Member identity | Enrollment System | `integrations/enrollment-system` |
| Enrollment and coverage | Enrollment System | `integrations/enrollment-system` |
| Member documents | Nuxeo | `integrations/nuxeo` |

## Current capabilities

| Capability | Description | Interface |
|---|---|---|
| Card retrieval | Returns the member's medical ID card | `GET /members/{memberId}/card` |
| Coverage summary | Returns active coverage for a member | Planned — not yet implemented |

## Request flow

```
Client → member-service → plan-resolver → card-service → Nuxeo
              │
              └── Enrollment System (member identity validation)
```

`member-service` is the entry point for member-facing requests. `plan-resolver`
determines which plan a member's documents are filed under. `card-service` retrieves
the document itself from Nuxeo.

## Membership model

Coverage is issued at the plan level. A member may hold more than one plan type
concurrently — for example, a member enrolled in both a medical plan and a dental
plan holds two active plan records in the Enrollment System.

Plan designs vary by employer group and by plan year.

## 2027 plan year: pharmacy benefit carve-out

Effective **January 1, 2027**, administration of pharmacy benefits moves from Acme to
an external pharmacy benefit manager (PBM).

- Members enrolled for the 2027 plan year are issued a separate pharmacy ID card in
  addition to their medical ID card.
- Pharmacy cards carry routing identifiers issued by the PBM (referred to in PBM
  correspondence as RxBIN, RxPCN, and RxGroup).
- Cards issued for the 2026 plan year combine medical and pharmacy benefits on a
  single card. Combined 2026 cards remain retrievable after January 1, 2027 —
  members with prior-plan-year claims or appeals activity continue to reference them.

Benefit administration for medical coverage is unaffected by the carve-out.
