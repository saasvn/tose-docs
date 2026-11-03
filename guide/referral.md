# Referral program

The TOSE referral program pays a share of your referred users' payments back to you as **TOSE wallet credit**. This page describes what the platform does today. Where a rule is still being changed, it says so and links the tracking issue.

::: warning Credit, not cash
Referral rewards are added to a workspace wallet as credit that pays for TOSE usage. TOSE has no cash payout for referral credit.
:::

## Commission tiers

Your tier is set by your **net referral volume**: the payments from your referred users that earned a commission, minus the refunded part of those payments.

| Tier | Commission rate | You reach it when referral volume is |
|------|-----------------|--------------------------------------|
| Scout | 20% | $0 or more (everyone starts here) |
| Builder | 30% | $3,000 or more (inclusive) |
| Ambassador | 40% | **more than** $5,000 (exclusive: exactly $5,000 is still Builder) |

A commission uses your tier **at the moment the referred user's payment completes**. The tier comes from the net volume *before* that payment, so the payment that crosses a threshold still earns the old rate. A later change of rank never recalculates a commission that was already credited.

The rates and thresholds are policy values held by the backend. Do not hard-code them. The `tiers` and `rank` fields of the [referral overview](#referral-overview-api) always return the values in force.

## How a referral works

1. **Share your link.** A referral code is created the first time you open the Referrals page of a workspace (or call the overview API). Until then you have no code. The link is `https://<app-host>/login?ref=YOUR_CODE`. The exact URL is the `profile.referral_url` field of the overview, and the Referrals page of the workspace dashboard shows it with a copy button.
2. **A new user signs up.** The code travels through email registration (`referral_code` in the request body) and through the GitHub and Google sign-in redirects. The login page also remembers the code in a `tose_ref` cookie and browser storage so it survives the redirect.
3. **A relationship is recorded.** One referral relationship per referred user, linking them to your code and to your *beneficiary workspace*, the workspace whose wallet receives your credit (by default the workspace whose Referrals page you opened first, if you own it; otherwise your oldest owned workspace, then your oldest membership).
4. **The referred user pays.** When a payment completes, TOSE creates one commission for that payment and adds it to the beneficiary wallet as a `referral_credit` transaction.

### What counts

- Only **completed Polar and SePay payments** earn a commission. Promotional credit, admin adjustments and the legacy signup bonus never do.
- The commission is `payment amount × rate`, calculated in cents and rounded down. A result of zero cents creates no commission.
- Each payment produces **at most one** commission. A webhook that arrives twice does not credit twice.
- A user has **one** referrer. A second code does not replace the first.
- Your own code is ignored if you use it yourself (a `referral_rejected` event with reason `self_referral` is logged). An unknown code is ignored.

### Status of a commission

| Status | Meaning |
|--------|---------|
| `credited` | The commission is in the wallet and nothing has been refunded. |
| `partially_reversed` | Part of the payment was refunded, so the matching share of the commission was taken back. |
| `reversed` | The whole payment was refunded and the whole commission was taken back. |

The referral page shows, for each commission, the rate that was actually applied, its status and the reversed amount. `pending` is not produced.

## Refunds and manual cases

- **Polar refunds are automatic.** When Polar refunds a payment, TOSE takes back the refunded share of the commission with a negative `referral_reversal` entry in the beneficiary wallet. A replayed refund event changes nothing.
- **Rank follows net volume.** Net volume is payments minus refunds, so a refund can lower your tier for *later* payments. It never changes commissions already credited.
- **A reversal never makes the wallet negative.** It takes at most the positive balance of the wallet (nothing if the balance is already zero or negative). If the balance is lower than the amount to take back, TOSE absorbs the shortfall; it does not suspend or reclaim your workloads because of it.
- **Not automated yet:** SePay refunds, and chargebacks from either provider, are handled **manually by a TOSE operator**. Until an operator acts, the commission stays credited. A manual adjustment changes the wallet only: it does not change the commission record, your net volume or your rank.

## Known limitations

| Area | Today | Tracking |
|------|-------|----------|
| SePay refunds and chargebacks | Not automated. An operator handles them by hand (see [Refunds and manual cases](#refunds-and-manual-cases)). | [tose-app#134](https://github.com/saasvn/tose-app/issues/134) |
| Two-sided rewards and campaigns | Not available. Only the referrer is rewarded. The wallet signup bonus is a separate `signup_bonus` transaction and is not part of the referral program. | [tose-app#139](https://github.com/saasvn/tose-app/issues/139) |

## Referral overview API

```http
GET /api/workspaces/{slug}/referrals
Authorization: Bearer <token>
```

Requires access to the workspace and the `billing.read` scope for [scoped API keys](/mcp/agent-access). It returns:

| Field | Content |
|-------|---------|
| `profile` | `code`, `referral_url`, `tier_name`, `tier_rate_bps`, `tier_rate_percent`, `beneficiary_workspace` |
| `stats` | `referred_users`, `credited_total` and `referral_volume` (both net of refunds), `reversed_total` and formatted versions (amounts in cents) |
| `rank` | Current tier, `progress_percent`, and `next` with `remaining_amount` to the next tier |
| `tiers` | The three tiers with `rate_bps`, `threshold_amount`, `is_current`, `is_reached` |
| `relationships`, `commissions`, `events` | The latest 50, 50 and 80 records. Each commission carries `applied_rate_bps`, `status` and `reversed_commission_amount` |
| `reconciliation` | Totals of commissions, wallet entries and rank, for checking that they agree |

Event types you may see: `profile_created`, `relationship_created`, `commission_credited`, `commission_reversed`, `tier_updated`, `referral_rejected` (the reason, such as `self_referral`, `invalid_code` or `existing_user`, is in its metadata). The list includes events where you are the referred user, not only the referrer.

## Campaign links and privacy

- Only the `ref` parameter is read for attribution. Other UTM parameters are not used for rewards, so do not rely on them to qualify a payment.
- The login page stores the code in a `tose_ref` cookie for 90 days on the TOSE cookie domain, and in browser local storage with no expiry. A `ref` in a newer link replaces the stored code.
- The `relationships` and `commissions` lists return only the `id` and `username` of the referred users. Email addresses and OAuth identifiers are not exposed to the referrer.

## FAQ

**Where do I see my credit?** In the wallet of the beneficiary workspace, as `referral_credit` transactions, and in the Referrals page of the workspace dashboard.

**Why is my rate lower than my tier?** The rate of a commission is your tier before that payment, and it is never recalculated afterwards. See [Commission tiers](#commission-tiers).

**Can I change the beneficiary workspace?** Not through a documented API today.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Referred user not listed | They registered without the code, or used a code that does not exist. A code used when signing in to an existing account is ignored. |
| No commission for a payment | The payer has no active relationship, the payment amount is zero, or the commission rounds down to zero cents. |
| `403` from the overview | The key or user lacks `billing.read` or access to that workspace. |

## Operations runbook

For TOSE administrators and moderators.

- **Suspected abuse** (self-dealing, repeated accounts): look at the `events` of the referrer, then adjust the beneficiary wallet with an `admin_adjust` transaction and record the reason. Do not edit existing ledger rows.
- **Polar refund:** nothing to do. The reversal is automatic; if it fails, the webhook returns a 5xx and Polar retries.
- **SePay refund, or a chargeback from either provider:** refund the payer with the provider first. If the payment earned a commission, debit the beneficiary wallet with `POST /admin/api/billing/wallets/:wallet_id/adjust`, with a description that names the payment. Debit no more than the current balance; the platform absorbs the rest. This does not change the commission record, net volume or rank. The same applies to a partial Polar refund that arrives before the commission exists.
- **Wrong tier shown:** open the overview; the tier is recalculated from net referral volume when the page loads and after each credited commission or reversal.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-01 | First version, written from the current implementation. |
| 2026-11-02 | Tier at payment time, Polar refund reversals, manual SePay and chargeback cases. |

## See also

- [Blog, widgets and editorial MCP (status)](./blog-and-editorial-mcp)
- [Pricing](./pricing)
