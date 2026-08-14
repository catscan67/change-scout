# Integration: Nuxeo

Nuxeo is Acme's document repository and the system of record for member documents —
ID cards, explanation-of-benefit statements, and member correspondence. Member Services
consumes it read-only and retrieves documents at request time.

## Document model

Documents are filed against the member and the plan they were issued under. The
composite key is member identifier plus plan, qualified by document type.

| Property | Notes |
|---|---|
| `uid` | Nuxeo document identifier |
| `memberId` | Member the document was issued to |
| `planId` | Plan the document was issued under |
| `planType` | Category of coverage the issuing plan provides |
| `docType` | `ID_CARD`, `EOB`, or `LETTER` |

Documents are immutable once filed and are retained under the schedule administered in
Nuxeo. A member accumulates documents over time — reissued cards, plan changes, and
successive plan years all add records rather than replacing them.

## Client operations

### `query(criteria)`

Returns every document matching the supplied criteria, in no guaranteed order.

```js
const documents = await nuxeo.query({
  memberId: 'M100200300',
  planId: 'ACME-PPO-2026',
  planType: 'MEDICAL',
  docType: 'ID_CARD'
});
```

A document record:

```js
{
  uid: '8f14e45f-ea8d-4b1c-9f2a-7c3d5e6a1b20',
  properties: {
    memberId: 'M100200300',
    memberName: 'JORDAN A RIVERA',
    planId: 'ACME-PPO-2026',
    planName: 'Acme PPO Choice',
    groupNumber: 'GRP-44120',
    issuedDate: '2025-11-14'
  }
}
```

## Environments and access

| Environment | Endpoint |
|---|---|
| Production | `https://nuxeo.acmehealth.internal/nuxeo/api/v1` |
| UAT | `https://nuxeo-uat.acmehealth.internal/nuxeo/api/v1` |

Write access is not provisioned for Member Services service accounts. Contact:
`ecm-platform@acme-health.example`.
