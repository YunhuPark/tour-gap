# Validation collector security

`public/` is the existing static survey, recovered without changing its questions or A/B content. `apps-script/Code.gs` is its reviewed Google Apps Script server. Run the dependency-free regressions from the repository root:

```sh
node --test apps/validation/tests/*.test.cjs
```

Configure `TOURGAP_SPREADSHEET_ID` in the existing script's private Script Properties. Never put the target ID or credentials into this repository. Keep the existing deployment ID, execute-as identity and access settings; publish a new reviewed version instead of creating a different public endpoint. The project and target Sheet should remain Restricted to their intended owner/operators.

The server preserves 15 survey columns and 9 event columns. It checks the study/type, allowed fields/form choices, UUIDs, timestamps and explicit consent before any Sheet access. Formula-leading strings receive a visible `TEXT: ` prefix, also applied in local CSV exports. Invalid requests return stable codes rather than internal exception text.

New writes are bounded globally to 60/minute and 1,000/day (Asia/Seoul), serialized and deduplicated. These controls do not authenticate respondents or provide complete bot/DDoS protection. Anonymous public surveys can still receive fabricated but schema-valid answers or have their shared budget exhausted.

Use GET only for fixed health/version metadata. `validation_only: true` validates a request without opening the Sheet or writing records. Run `verifyConfiguration` only in the owner's editor; it checks property/tab existence and column capacity, without reading response cells or appending a test row. Production verification must not add test responses or attack formulas to the real Sheet.

The client retains events only in bounded memory until consent, enforces form validity/consent, and preserves existing consented local records. It stops adding records at the local cap without deleting old entries. Local records remain readable by someone using that same browser profile; use an operator-controlled browser for field collection and export/clear records deliberately. The cross-origin opaque response cannot acknowledge central storage, so the page says delivery is unconfirmed. Existing source URLs/access scopes are retained and no additional paid service is required.
