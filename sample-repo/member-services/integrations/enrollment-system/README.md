# Integration: Enrollment System

The Enrollment System is Acme's system of record for member identity, enrollment, and
coverage. Member Services consumes it read-only.

## Responsibilities

The Enrollment System integration is the only component permitted to determine whether
a member identifier is valid and whether the member is eligible. That determination is
an auditable event and its record is maintained upstream, not here.

## Client operations

### `validateMember(memberId, { correlationId })`

Confirms that a member identifier exists and resolves it to its canonical form.

```js
{
  valid: true,
  memberId: 'M100200300',   // canonical identifier
  status: 'ACTIVE'
}
```

Returns `{ valid: false }` for identifiers that are unknown, retired, or merged into
another member record.

### `getEnrollments(memberId)`

Returns every enrollment record held for the member, in no guaranteed order.

```js
[
  {
    planId: 'ACME-PPO-2026',
    planType: 'MEDICAL',
    status: 'ACTIVE',
    effectiveDate: '2026-01-01',
    termDate: '2026-12-31'
  }
]
```

| Field | Notes |
|---|---|
| `planId` | Identifier of the plan the member is enrolled in |
| `planType` | Category of coverage the plan provides |
| `status` | `ACTIVE`, `TERMINATED`, or `PENDING` |
| `effectiveDate` | First day of coverage under this enrollment |
| `termDate` | Last day of coverage under this enrollment |

Members enrolled across multiple plan years, or in more than one line of coverage,
have more than one record in this response.

## Environments and access

| Environment | Endpoint |
|---|---|
| Production | `https://enrollment.acmehealth.internal/api/v3` |
| UAT | `https://enrollment-uat.acmehealth.internal/api/v3` |

Access is granted per service account by the Enrollment platform team. Contact:
`enrollment-platform@acme-health.example`.
