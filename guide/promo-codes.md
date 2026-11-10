# Promo codes and bonus credit

A promo code lowers what you pay for a wallet top-up, or adds **bonus credit** on top of it. You enter the code when you top up your workspace wallet. This page describes the user flow and the rules. The endpoints are in the [Promo codes API](/api/promo-codes).

## Kinds of code

| Kind | What you pay | What the wallet receives |
|------|--------------|--------------------------|
| `percent` | The amount minus a percentage | The **full** amount you chose |
| `fixed` | The amount minus a fixed sum in USD | The **full** amount you chose |
| `bonus` | The full amount | The full amount, plus promotional credit |

A discount does not reduce what the wallet is credited (with one exception, see [Rules](#rules)): top up $50 with a `percent` code worth 20% and you pay $40 and receive $50. A discounted payment can never fall below the payment provider's minimum ($1.00 on Polar, 10,000 VND on SePay); a code that would push it under is refused.

## Use a code

1. Open the **Billing** page of your workspace and choose **Top up**.
2. Pick the currency (USD through Polar, VND through SePay) and the amount.
3. Type the code in **Promo code (optional)** and choose **Apply**. The page shows what you would pay. For a bonus code it also shows the bonus amount and how many days it stays valid. Applying a code only previews it; nothing is reserved yet.
4. Continue to pay. The code is checked again and reserved when the payment is created.

Codes are not case sensitive. Each payment takes one code.

### A link that pre-fills the code

`https://<app-host>/billing?code=YOUR-CODE` opens the billing page of your own workspace (the first one you own, otherwise the first you belong to), opens the top-up window and fills in the code. The link needs no workspace slug, so it works in emails and newsletters. You are asked to sign in first if you are not. To go to a specific workspace, use `https://<app-host>/w/<workspace-slug>/billing?code=YOUR-CODE`.

### Why a code can be refused

A refused code never changes the payment. The message tells you why:

| `code` | Meaning |
|--------|---------|
| `PROMO_NOT_FOUND` | The code does not exist. |
| `PROMO_INACTIVE` | The code was disabled. |
| `PROMO_NOT_STARTED` | The code is not valid yet. |
| `PROMO_EXPIRED` | The code has expired. |
| `PROMO_NOT_APPLICABLE` | The code does not apply to this kind of payment. |
| `PROMO_MIN_AMOUNT` | The payment is below the code's minimum. The message states it. |
| `PROMO_FIRST_TOPUP_ONLY` | The code is only valid on a workspace's first top-up. |
| `PROMO_BELOW_MINIMUM` | After the discount the payment would be below the provider minimum. |
| `PROMO_EXHAUSTED` | The code has been fully used. |
| `PROMO_USER_LIMIT` | You have already used this code. |
| `PROMO_CAMPAIGN_USED` | You, or this workspace, already used a code from the same promotion. |

## Rules

- **Limits.** A code can have a minimum amount, a first-top-up-only rule, a start and an expiry date, a total number of uses and a number of uses per person. Codes belonging to one **campaign** can be redeemed once per person and once per workspace, in total.
- **One code per payment, no stacking.** A payment that uses a code earns no top-up bonus and no [referral commission](/guide/referral). If the code is rejected when the payment completes (see below), the payment earns commission as usual.
- **Wallet top-ups only by default.** A code applies to unlocking a template (Dewee, GoClaw) only when the operator allowed it. Bonus credit never applies to a template unlock.
- **Abandoned checkouts.** If you start a payment with a code and never finish it, your next payment with the same code (or one from the same campaign) takes over. Your own abandoned checkout does not lock a single-use code for you. Someone else's unfinished checkout with the same code, including a teammate's on a campaign code, still counts against its limits until it is finished or replaced.
- **A code can be rejected when the payment completes.** The rules are checked again at completion. If the code can no longer be honored (for example another top-up completed first on a first-top-up-only code, or an abandoned payment is completed late), the discount is dropped and the wallet is credited what you actually paid.
- **First top-up.** "First" means the workspace has no earlier completed or refunded top-up. A workspace whose first top-up was refunded can no longer use a first-top-up-only code.

## Bonus credit

A `bonus` code adds promotional credit to the wallet **after** the payment completes. It shows in the wallet history as a `promo_credit` transaction with its expiry date.

- **Spent first.** Hourly compute and storage usage is charged to promotional credit before paid credit, soonest-expiring first.
- **It expires.** When the credit passes its expiry date (`credit_valid_days` of the code, counted from when the payment completes), what is left of it is taken back with a `promo_expired` transaction. Credit spent on hourly usage is yours. The wallet never goes below zero because of this.
- **Refunds.** A full refund of the payment releases the code and takes back the unspent bonus credit (a `promo_revoked` transaction). A partial refund keeps the code and the credit.
- **Not cash.** Bonus credit pays for TOSE usage only and cannot be withdrawn.

::: warning SePay refunds
SePay sends no refund notification, so a refunded SePay payment is not released automatically: its code and bonus credit stay as they are until TOSE handles the refund. Polar refunds are handled automatically.
:::

## AgentKit × TOSE launch

For the AgentKit launch, each customer receives a personal code named `AKTOSE-XXXX-XXXX` for **$100 of bonus credit** on the first top-up of a workspace:

| Term | Value |
|------|-------|
| Code kind | `bonus` |
| Minimum top-up | $20 |
| Valid on | The first top-up of a workspace (a refunded top-up counts as taken) |
| Uses | One per code, one per person |
| Credit validity | 90 days from the payment |

The terms of a code are always shown when you apply it, so trust the preview over this table if they differ. If a code is spent, expired or already used, the message names the reason.

## For platform operators

Operators create and manage codes through the admin console REST API or through MCP tools that only platform admins can see. See [Operate discount codes](/api/promo-codes#admin).

## Related

- [Promo codes API](/api/promo-codes)
- [Pricing](/guide/pricing)
- [Referral program](/guide/referral)
