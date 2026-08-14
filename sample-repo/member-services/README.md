# member-services

Member-facing read APIs over Acme Health Plan's systems of record. Member Services
holds no member data of its own — it validates the member context, resolves the plan a
document is filed under, and returns the document retrieved from Nuxeo.

> **This is a fictional repository.** Acme Health Plan does not exist. It is bundled
> with the Change Impact Scout plugin as a worked example: a small repository carrying
> the kinds of architectural evidence — contracts, ownership documentation, integration
> definitions, and tests — that the plugin is designed to read. The services are
> illustrative rather than complete; there is no server, no database, and no deployment.

## Layout

| Path | Contents |
|---|---|
| `docs/` | Architecture overview and data-ownership rules |
| `openapi/` | Published API contracts |
| `services/` | Member Services components |
| `integrations/` | Upstream system contracts consumed by this service |
| `tests/` | Test suite |

## Commands

```bash
npm test                  # run the test suite (Node 20+, no dependencies to install)
npm run validate:openapi  # lint the published API contract
```
