# Referral program

The TOSE referral program pays a share of your referred users' payments back to you as **TOSE wallet credit**. This page describes what the platform does today. Where a rule is still being changed, it says so and links the tracking issue.

::: warning Credit, not cash
Referral rewards are added to a workspace wallet as credit that pays for TOSE usage. TOSE has no cash payout for referral credit.
:::

## Commission tiers

Your tier is set by your **referral volume**: the total amount of the payments from your referred users that have already produced a credited commission.

| Tier | Commission rate | You reach it when referral volume is |
|------|-----------------|--------------------------------------|
| Scout | 20% | $0 or more (everyone starts here) |
| Builder | 30% | $3,000 or more (inclusive) |
| Ambassador | 40% | **more than** $5,000 (exclusive: exactly $5,000 is still Builder) |

The rates and thresholds are policy values held by the backend. Do not hard-code them. The `tiers` and `rank` fields of the [referral overview](#referral-overview-api) always return the values in force.

## How a referral works

1. **Share your link.** A referral code is created the first time you open the Referrals page of a workspace (or call the overview API). Until then you have no code. The link is `https://<app-host>/login?ref=YOUR_CODE`. The exact URL is the `profile.referral_url` field of the overview, and the Referrals page of the workspace dashboard shows it with a copy button.
2. **A new user signs up.** The code travels through email registration (`referral_code` in the request body) and through the GitHub and Google sign-in redirects. The login page also remembers the code in a `tose_ref` cookie and browser storage so it survives the redirect.
3. **A relationship is recorded.** One referral relationship per referred user, linking them to your code and to your *beneficiary workspace*, the workspace whose wallet receives your credit (by default the workspace whose Referrals page you opened first, if you own it; otherwise your oldest owned workspace, then your oldest membership).
4. **The referred user pays.** When a payment completes, TOSE creates one commission for that payment and adds it to the beneficiary wallet as a `referral_credit` transaction.

### What counts

- The commission is `payment amount × rate`, calculated in cents and rounded down. A result of zero cents creates no commission.
- Each payment produces **at most one** commission. A webhook that arrives twice does not credit twice.
- A user has **one** referrer. A second code does not replace the first.
- Your own code is ignored if you use it yourself (a `self_referral_ignored` event is logged). An unknown code is ignored.

### Status of a commission

| Status | Meaning |
|--------|---------|
| `credited` | The commission is in the wallet and counts toward your referral volume. |

`pending` and `reversed` are not produced by the current implementation. See [Known limitations](#known-limitations).

## Known limitations

These behaviors are what the code does today. They are being corrected and this page will change when each fix ships.

| Area | Today | Tracking |
|------|-------|----------|
| Who can be attached | The code is applied on registration and also on login and OAuth callbacks, so an existing user without a referrer can be attached by signing in through a new link. Treat only brand-new sign-ups as eligible; do not promise otherwise to anyone. | [tose-app#132](https://github.com/saasvn/tose-app/issues/132) |
| Which rate applies | The rate is copied onto the relationship when it is created. Commissions on that referral keep that rate even after you move up a tier. | [tose-app#134](https://github.com/saasvn/tose-app/issues/134) |
| Refunds and chargebacks | There is no automatic reversal. A refunded payment's commission stays credited until an administrator adjusts the wallet. | [tose-app#134](https://github.com/saasvn/tose-app/issues/134) |
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
| `stats` | `referred_users`, `credited_total`, `referral_volume` and formatted versions (amounts in cents) |
| `rank` | Current tier, `progress_percent`, and `next` with `remaining_amount` to the next tier |
| `tiers` | The three tiers with `rate_bps`, `threshold_amount`, `is_current`, `is_reached` |
| `relationships`, `commissions`, `events` | The latest 50, 50 and 80 records |

Event types you may see: `profile_created`, `relationship_created`, `commission_credited`, `tier_updated`, `self_referral_ignored`. The list includes events where you are the referred user, not only the referrer.

## Campaign links and privacy

- Only the `ref` parameter is read for attribution. Other UTM parameters are not used for rewards, so do not rely on them to qualify a payment.
- The login page stores the code in a `tose_ref` cookie for 90 days on the TOSE cookie domain, and in browser local storage with no expiry. A `ref` in a newer link replaces the stored code.
- The `relationships` and `commissions` lists include the referred user's profile as the API serializes it, which today contains the email address and OAuth identifiers, not only the name. Treat that as personal data. Narrowing it is tracked in [tose-app#198](https://github.com/saasvn/tose-app/issues/198).

## FAQ

**Where do I see my credit?** In the wallet of the beneficiary workspace, as `referral_credit` transactions, and in the Referrals page of the workspace dashboard.

**Why is my rate lower than my tier?** See [Which rate applies](#known-limitations).

**Can I change the beneficiary workspace?** Not through a documented API today.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Referred user not listed | They registered without the code, or used a code that does not exist. A code supplied after the account already has a referrer is ignored. |
| No commission for a payment | The payer has no active relationship, the payment amount is zero, or the commission rounds down to zero cents. |
| `403` from the overview | The key or user lacks `billing.read` or access to that workspace. |

## Operations runbook

For TOSE administrators and moderators.

- **Suspected abuse** (self-dealing, repeated accounts): look at the `events` of the referrer, then adjust the beneficiary wallet with an `admin_adjust` transaction and record the reason. Do not edit existing ledger rows.
- **Refund or chargeback on a referred payment:** the commission is not reversed automatically. Compute `commission_amount` from the commission record and post an offsetting `admin_adjust` transaction on the beneficiary wallet.
- **Wrong tier shown:** open the overview; the tier is recalculated from referral volume when the page loads and after each credited commission.

## Changelog

| Date | Change |
|------|--------|
| 2026-11-01 | First version, written from the current implementation. |

## See also

- [Blog, widgets and editorial MCP (status)](./blog-and-editorial-mcp)
- [Pricing](./pricing)
