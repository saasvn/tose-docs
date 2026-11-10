# Promo codes API

Promo codes lower a wallet top-up or add bonus credit to it, either a fixed amount or a percentage of the top-up (`match_percent`). For what the kinds mean and the rules around them, see [Promo codes and bonus credit](/guide/promo-codes). This page lists the endpoints.

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
| `discount_usd_cents` | The discount in USD cents. `0` for a bonus or match code. |
| `bonus_cents` | Promotional credit added after payment, in USD cents. `0` unless the kind is `bonus` or `match_percent`. |
| `credit_usd_cents` | Paid credit the wallet receives for this payment: the full amount. If the code is rejected when the payment completes, the wallet receives what you paid instead. |
| `total_credit_cents` | Paid plus bonus credit the wallet receives, in USD cents (`credit_usd_cents` + `bonus_cents`). |
| `description` | The code's description, when it has one. |
| `credit_valid_days` | Days the bonus credit can be spent. Only set for bonus or match codes with an expiry. |

For a `match_percent` code, `bonus_cents` is the top-up times `percent_off`, capped at the code's `amount_cents`. A VND amount is converted to dollars at a reference exchange rate of the day before the percentage and the cap are applied, and the rate is not part of the response. The reference rate only decides the bonus, never the balance credited for the VND you pay, which uses the wallet's rate. If the rate source fails, TOSE uses the last rate it fetched, or the wallet's fixed rate when it has fetched none (the stored rate is kept in memory, so it is lost when the service restarts). Example for a $60 top-up with a 100% code capped at $100:

```json
{
  "code": "AKTOSE-7QXM-K4HP",
  "kind": "match_percent",
  "currency": "USD",
  "original_amount": 6000,
  "charged_amount": 6000,
  "discount_usd_cents": 0,
  "bonus_cents": 6000,
  "credit_usd_cents": 6000,
  "total_credit_cents": 12000,
  "credit_valid_days": 90
}
```

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
| `prefix`, `count` | A prefix of 3 to 20 characters (same alphabet). Generate `count` (2 to 5000) codes named `PREFIX-XXXX-XXXX`. Each is single use (`max_redemptions` 1, `max_per_user` 1). The alphabet leaves out `0`, `O`, `1` and `I`. |
| `kind` | `percent`, `fixed`, `bonus` or `match_percent`. |
| `percent_off` | 1 to 100: the percentage off for `percent`, the percentage of the top-up matched for `match_percent`. |
| `amount_cents` | 1 to 1,000,000, for `fixed` (the discount), `bonus` (the credit) and `match_percent` (the cap on the bonus). |
| `emails` | A list of addresses, with `prefix`, instead of `count`. Creates one single-use code per address and records the address on it. Addresses are lower-cased and de-duplicated, an invalid address refuses the whole request, and giving both `emails` and a `count` above 1 is refused. The number of addresses counts against the batch limit of 5000. The address is returned as `assigned_email` on each code. The address is a record for the operator, not a restriction: the code works for whoever redeems it first. |
| `applies_to` | `wallet_topup` and/or `template_unlock`. Default `wallet_topup`. A bonus or match code cannot include `template_unlock`. |
| `min_amount_cents` | Smallest payment, before the discount, the code accepts. |
| `first_topup_only` | The workspace must have no earlier completed top-up. |
| `max_redemptions` | Total uses. `0` is unlimited. |
| `max_per_user` | Uses per person. Default `1`, `0` is unlimited. |
| `credit_valid_days` | Days a bonus stays spendable (up to 3650). `0` never expires. Bonus and match codes only. |
| `starts_at`, `expires_at` | RFC 3339 window. `expires_at` must be after `starts_at`. |
| `campaign` | Groups codes into one promotion: a person and a workspace redeem at most one code per campaign. Up to 64 characters. The campaign can also have a shared limit, see [Campaign limits](#admin-campaign). |
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
| `POST /admin/api/promo-codes/redemptions/{id}/release` | Release one redemption. Body `{"reason"}` (optional, kept on the redemption). See [Release a redemption](#admin-release). |
| `GET /admin/api/promo-codes/campaigns/{campaign}` | Number of codes, ledger `stats` and the shared limit `usage` of a campaign. |
| `PUT /admin/api/promo-codes/campaigns/{campaign}` | Set the shared limit of a campaign. Body `{"max_redemptions": 300}`, required, `0` removes the limit. See [Campaign limits](#admin-campaign). |
| `GET /admin/api/promo-codes/campaigns/{campaign}/codes.csv` | Download the campaign's codes as CSV with the columns `email`, `code` and `status`, ordered by email, for a newsletter merge. An address that starts with `=`, `+`, `-` or `@` is prefixed with an apostrophe so spreadsheets do not evaluate it as a formula. |

`stats` holds `reserved`, `redeemed`, `released`, `rejected`, `discount_cents`, `bonus_granted_cents` and `bonus_unspent_cents`.

Disabling a code, or letting it expire, does not cancel a payment that already reserved it: that payment keeps its price.

Errors carry `{"error", "code"}`: `INVALID` (`400`), `NOT_FOUND` (`404`) and `CONFLICT` (`409`, a code with that name already exists). A malformed body answers `400` and an unexpected failure `500`, both without a `code`.

### MCP tools

On the [MCP connector](/mcp), eight more tools exist for platform admins. They need the `admin:discounts` scope **and** a user who is a platform admin right now. For everyone else they are hidden from `tools/list` and refused when called, and the check fails closed when the admin lookup errors. The scope is dropped when a non-admin gives consent and on every refresh after a user stops being an admin.

| Tool | Does | Changes anything? |
|------|------|-------------------|
| `create_discount_codes` | Create one code or a batch with the fields above. | Yes |
| `list_discount_codes` | List codes. Filters `campaign`, `status`, `query`, `limit`, `offset`. | No |
| `get_discount_code` | One code (by code or ID) with its totals, or the totals of a `campaign` with its shared limit: used and remaining places. | No |
| `update_discount_code` | Change `description`, limits, window or `status`. | Yes |
| `disable_discount_code` | Stop a code from being applied to new payments. | Yes |
| `list_discount_redemptions` | The ledger of a `code` or a `campaign`, newest first. | No |
| `release_discount_redemption` | Release one redemption by ID, with a `reason`. | Yes |
| `set_discount_campaign` | Set the shared limit of a `campaign` (`max_redemptions`, `0` = unlimited) and return its used and remaining places. Safe to repeat. | Yes |

### Campaign limits {#admin-campaign}

A campaign can cap how many payments all of its codes together may be applied to, first come, first served. Set it with `PUT /admin/api/promo-codes/campaigns/{campaign}` or the MCP tool `set_discount_campaign`, with `max_redemptions` (`0` removes the limit). The campaign name is 1 to 64 characters and a negative number is refused with `INVALID`. A body without `max_redemptions` answers `400` with `{"error"}` only, without a `code`. A campaign without a limit has no cap. When the limit is reached, applying a code of the campaign answers `PROMO_CAMPAIGN_EXHAUSTED`.

```json
{
  "campaign": {"name": "agentkit-tose", "max_redemptions": 300, "created_at": "...", "updated_at": "..."},
  "usage": {"campaign": "agentkit-tose", "max_redemptions": 300, "used": 212, "remaining": 88}
}
```

`used` counts redeemed payments and reservations that still hold a place. `remaining` is left out when the campaign has no limit. The same `usage` appears in `GET /admin/api/promo-codes/campaigns/{campaign}` and in `get_discount_code` with a `campaign`.

- **Hold.** A reservation on a pending payment holds its place for two hours. After that the place is open to the next payer. If that payment is completed later anyway, it gets its discount or bonus only while the campaign still has room. Otherwise the redemption is rejected at completion and the payment is credited what was paid.
- **Lowering a limit** below `used` only stops new redemptions. Nothing already granted is taken back.

### Release a redemption {#admin-release}

A redemption that is no longer wanted, for example after a SePay refund (SePay sends no refund webhook, so it is never released automatically), can be released by an operator. Call the MCP tool `release_discount_redemption` or `POST /admin/api/promo-codes/redemptions/{id}/release` with the body `{"reason": "..."}`. A redemption that is still `reserved` (its payment has not completed) is refused with `CONFLICT` (`409`). Releasing a completed redemption frees the code's use and takes back the unspent bonus credit, like a full refund of a Polar payment. Releasing twice is harmless, and an unknown ID answers `NOT_FOUND` (`404`).

Every create, update, disable, release and campaign limit change is written to the [audit log](/api/audit) with high risk, from both REST and MCP. A CSV export (REST only) is written the same way.

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

Each code is single use and a used-up code answers `PROMO_EXHAUSTED`. To cap the whole campaign, for example at the first 300 payments whatever the number of codes issued, call `set_discount_campaign` with `campaign: "agentkit-tose"` and `max_redemptions: 300`. Follow used and remaining places with `get_discount_code` and `campaign: "agentkit-tose"`. To issue one code per customer instead, pass `emails` in place of `count`, then download the codes from `GET /admin/api/promo-codes/campaigns/agentkit-tose/codes.csv`.

## Related

- [Promo codes and bonus credit](/guide/promo-codes)
- [API keys and scopes](/api/api-keys)
- [Errors](/api/errors)
