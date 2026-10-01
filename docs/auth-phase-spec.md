# Authentication / first-run (canonical spec)

Use this document when implementing the auth phase — **not** a generic connect form.

## Visible fields only

- Work email (placeholder: `name@altenar.com`)
- Jira API token
- BambooHR API key

Do **not** show editable Jira URL, Bamboo URL, or Bamboo subdomain.

## Fixed internal configuration

Single module: `src/config/company.ts` (do not duplicate strings).

| Constant | Value |
|----------|--------|
| `JIRA_BASE_URL` | `https://altenar.atlassian.net` |
| `BAMBOO_BASE_URL` | `https://altenar.bamboohr.com` |
| `BAMBOO_SUBDOMAIN` | `altenar` |

## Layout

Follow the supplied auth screenshot reference:

- Centered content, light neutral page background
- Temporary text logo **metrio** (blue, semibold) — no SVG until provided
- White form surface; full-width **Connect & continue**
- Jira row: token + **Get API token** (Atlassian API token page)
- Bamboo row: API key + **Get API key** (`…/app/settings/permissions/api_keys`)
- Footer: **Can't find API Keys?** + credentials stored securely copy

## Validation & behavior

- Email: `*@altenar.com` (trim + lowercase)
- Submit enabled only when email valid + both secrets non-empty
- Secrets: native secure storage only — never localStorage / preferences / logs
- User-facing errors only — no raw API dumps

## Product shell

Production `App.tsx` must **not** mount Foundation demo toolbar/footer.

Foundation gallery remains **dev-only** (`import.meta.env.DEV`) for component approval.
