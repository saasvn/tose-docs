# Promo codes API

Promo codes lower a wallet top-up or add bonus credit to it. For what the kinds mean and the rules around them, see [Promo codes and bonus credit](/guide/promo-codes). This page lists the endpoints.

## Preview a code {#preview}

`POST /api/workspaces/{slug}/wallet/promo/preview`

Checks a code against an amount and shows what you would pay and receive. It reserves nothing, so it can be called as often as needed. It needs access to the workspace. An API key needs the `billing:write` scope (the same as the top-up endpoints), otherwise it gets `403 insufficient_scope`.

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Required. Not case sensitive. |
| `amount` | integer | Required. USD cents, or VND when `currency` is `VND`. |
| `currency` | string | `USD` (default) or `VND`. |
| `purpose` | string | `wallet_topup` (default). Any other value is treated as a template unlock. The preview uses the `amount` you send, while the payment endpoints replace it with the template's unlock fee, so preview a template unlock with that fee. |

```bash
curl -X POST https://<api-host>/api/workspaces/acme/wallet/promo/preview \
  -H "Authorization: Bearer $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"AKTOSE-7QXM-K4HP","amount":5000,"currency":"USD"}'
```

```json
{
  "code": "AKTOSE-7QXM-K4HP",
  "kind": "bonus",
  "currency": "USD",
  "original_amount": 5000,
  "charged_amount": 5000,
  "discount_usd_cents": 0,
  "bonus_cents": 10000,
  "credit_usd_cents": 5000,
  "credit_valid_days": 90
}
```

| Field | Description |
|-------|-------------|
| `original_amount`, `charged_amount` | The amount before the code and what you would pay, in the request's currency (VND or USD cents). |
| `discount_usd_cents` | The discount in USD cents. `0` for a bonus code. |
| `bonus_cents` | Promotional credit added after payment. `0` unless the kind is `bonus`. |
| `credit_usd_cents` | Paid credit the wallet receives for this payment: the full amount. If the code is rejected when the payment completes, the wallet receives what you paid instead. |
| `description` | The code's description, when it has one. |
| `credit_valid_days` | Days the bonus credit can be spent. Only set for bonus codes with an expiry. |

A refused code answers `400` with `{"error": "...", "code": "PROMO_..."}`. The `code` values are listed in [Why a code can be refused](/guide/promo-codes#why-a-code-can-be-refused). A workspace you cannot access answers `404`.

## Pay with a code {#pay}

Both top-up endpoints accept an optional `code` in the JSON body:

| Endpoint | Body | Currency |
|----------|------|----------|
| `POST /api/workspaces/{slug}/wallet/topup/polar` | `{"amount": 5000, "code": "..."}` | USD cents |
| `POST /api/workspaces/{slug}/wallet/topup/sepay` | `{"amount": 1300000, "code": "..."}` | VND |

The code is checked and reserved in the same transaction that creates the payment, so a payment never exists with a code that was not checked. A refused code answers `400` with the same body as the preview, and no payment is created.

The response gains a `promotion` object with the same fields as the preview (`null` when no code was sent). `amount` is what you pay: for Polar the checkout is created for the discounted price, and for SePay the transfer amount and QR code use it. The wallet is credited the full amount you chose.

Polar's own discount-code field is turned off on these checkouts. Enter the code in TOSE before you pay.

## Wallet transactions

| `type` | When |
|--------|------|
| `promo_credit` | Bonus credit was added after the payment completed. |
| `promo_expired` | The unspent part of bonus credit was taken back at its expiry. |
| `promo_revoked` | The unspent part of bonus credit was taken back after a full refund. |

## Operate discount codes {#admin}

::: warning Platform admins only
These endpoints and tools are for TOSE platform operators. They are not available to workspace owners or API keys.
:::

All amounts are USD cents. Codes are stored upper-case.

### Fields of a code

| Field | Description |
|-------|-------------|
| `code` | A named code, 3 to 40 letters, digits, `-` or `_`, starting with a letter or digit. Give this **or** `prefix` with `count`. |
| `prefix`, `count` | A prefix of 3 to 20 characters (same alphabet). Generate `count` (2 to 1000) codes named `PREFIX-XXXX-XXXX`. Each is single use (`max_redemptions` 1, `max_per_user` 1). The alphabet leaves out `0`, `O`, `1` and `I`. |
| `kind` | `percent`, `fixed` or `bonus`. |
| `percent_off` | 1 to 100, for `percent` only. |
| `amount_cents` | 1 to 1,000,000, for `fixed` (the discount) and `bonus` (the credit). |
| `applies_to` | `wallet_topup` and/or `template_unlock`. Default `wallet_topup`. A bonus code cannot include `template_unlock`. |
| `min_amount_cents` | Smallest payment, before the discount, the code accepts. |
| `first_topup_only` | The workspace must have no earlier completed top-up. |
| `max_redemptions` | Total uses. `0` is unlimited. |
| `max_per_user` | Uses per person. Default `1`, `0` is unlimited. |
| `credit_valid_days` | Days a bonus stays spendable (up to 3650). `0` never expires. Bonus codes only. |
| `starts_at`, `expires_at` | RFC 3339 window. `expires_at` must be after `starts_at`. |
| `campaign` | Groups codes into one promotion: a person and a workspace redeem at most one code per campaign. Up to 64 characters. |
| `description` | Up to 500 characters. |

Only `description`, `max_redemptions`, `max_per_user`, `starts_at`, `expires_at` and `status` can be changed after creation. The name, `kind`, amounts, `applies_to`, `min_amount_cents`, `first_topup_only`, `credit_valid_days` and `campaign` are fixed. Create a new code instead.

### REST

The routes belong to the admin console API and use the admin console sign-in, not a workspace API key.

| Route | Does |
|-------|------|
| `POST /admin/api/promo-codes` | Create a code or a batch. Answers `201` with `codes` and `count`. |
| `GET /admin/api/promo-codes` | List, newest first. Query: `campaign`, `status` (`active` or `disabled`), `q` (substring of the code), `limit` (1 to 200; a larger value falls back to 50, default 50), `offset`. |
| `GET /admin/api/promo-codes/{id}` | One code (by ID or code) with its ledger `stats`. |
| `PATCH /admin/api/promo-codes/{id}` | Change `description`, `max_redemptions`, `max_per_user`, `starts_at`, `expires_at` or `status`. |
| `POST /admin/api/promo-codes/{id}/disable` | Stop the code from being applied to new payments. |
| `GET /admin/api/promo-codes/{id}/redemptions` | The code's redemption ledger. |
| `GET /admin/api/promo-codes/campaigns/{campaign}` | Number of codes and ledger `stats` of a campaign. |

`stats` holds `reserved`, `redeemed`, `released`, `rejected`, `discount_cents`, `bonus_granted_cents` and `bonus_unspent_cents`.

Disabling a code, or letting it expire, does not cancel a payment that already reserved it: that payment keeps its price.

Errors carry `{"error", "code"}`: `INVALID` (`400`), `NOT_FOUND` (`404`) and `CONFLICT` (`409`, a code with that name already exists). A malformed body answers `400` and an unexpected failure `500`, both without a `code`.

### MCP tools

On the [MCP connector](/mcp), six more tools exist for platform admins. They need the `admin:discounts` scope **and** a user who is a platform admin right now. For everyone else they are hidden from `tools/list` and refused when called, and the check fails closed when the admin lookup errors. The scope is dropped when a non-admin gives consent and on every refresh after a user stops being an admin.

| Tool | Does | Changes anything? |
|------|------|-------------------|
| `create_discount_codes` | Create one code or a batch with the fields above. | Yes |
| `list_discount_codes` | List codes. Filters `campaign`, `status`, `query`, `limit`, `offset`. | No |
| `get_discount_code` | One code (by code or ID) with its totals, or the totals of a `campaign`. | No |
| `update_discount_code` | Change `description`, limits, window or `status`. | Yes |
| `disable_discount_code` | Stop a code from being applied to new payments. | Yes |
| `list_discount_redemptions` | The ledger of a `code` or a `campaign`, newest first. | No |

Every create, update and disable is written to the [audit log](/api/audit) with high risk, from both REST and MCP.

### Example: the AgentKit launch codes

Ask an admin-scoped agent to create 300 codes, or call `create_discount_codes` with:

```json
{
  "prefix": "AKTOSE",
  "count": 300,
  "campaign": "agentkit-tose",
  "kind": "bonus",
  "amount_cents": 10000,
  "credit_valid_days": 90,
  "min_amount_cents": 2000,
  "first_topup_only": true,
  "max_redemptions": 1,
  "max_per_user": 1,
  "expires_at": "2027-01-03T00:00:00Z"
}
```

The budget is the number of codes: there is no campaign-wide cap, and a used-up code answers `PROMO_EXHAUSTED`. Follow the campaign with `get_discount_code` and `campaign: "agentkit-tose"`.

## Related

- [Promo codes and bonus credit](/guide/promo-codes)
- [API keys and scopes](/api/api-keys)
- [Errors](/api/errors)
