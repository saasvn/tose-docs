# Link an earlier enquiry to your account

If you sent a request through [tose.sh](https://tose.sh) before you signed up, you can link that enquiry to your TOSE account. Linking is optional, and it only happens when you agree to it.

## What linking does

Linking tells tose.sh that the enquiry you sent earlier belongs to your TOSE account, so the team can see which account it came from. Nothing is linked by matching your email address on its own. TOSE never links an enquiry unless you tick the consent box and press the button.

## Where to find it

- **Projects page:** the card "Link an earlier enquiry" appears until you have used it.
- **Workspace Settings:** the same card stays available, so you can withdraw your authorization later.

The card is hidden when linking is not available for your account or on your TOSE installation.

## Who can use it

Only accounts with a **verified email** can link:

| How you signed in | Can link? |
|---|---|
| Google, with a verified email | Yes |
| GitHub, with an address on GitHub's verified list | Yes |
| Email and password, after you [confirm your email](/guide/installation#confirm-your-email) | Yes |
| Email and password, before you confirm | No. These accounts get `409 email_not_verified`. |

The check runs at every Google or GitHub sign-in. If the provider stops reporting your email as verified, the card is hidden on the Projects page and you cannot authorize again until it does. If you already have an authorization, the Settings card stays visible so you can withdraw it.

## What data is shared

| Sent to tose.sh | Never sent |
|---|---|
| A keyed one-way hash of your email | Your email address |
| Your opaque account id | Your name, username or any other profile data |
| The consent version you agreed to and when you agreed | Your projects, workspaces, billing or usage |
| A marker that you confirmed it yourself (`user_confirmed`) | |

TOSE stores no copy of your enquiry, contact details or email for this feature. It keeps the time and version of your consent as evidence that you agreed, and the email hash it sent, so a withdrawal can remove the same link even if your account email changed later.

## Link an enquiry

1. Sign in with Google or GitHub.
2. Open the **Projects** page, or **Settings** in your workspace.
3. In "Link an earlier enquiry", tick the consent box.
4. Press **Link my enquiry**.

The card then shows **Linked.** If tose.sh cannot be reached, it shows "Last attempt failed. You can try again." TOSE also retries the delivery in the background (every 5 minutes, up to 20 attempts), and you can press the button again.

tose.sh gives the same answer whether or not it found an enquiry for your hash, so linking does not reveal who has contacted tose.sh.

## Withdraw your authorization

Press **Withdraw my authorization** on the card (it appears in Settings while an authorization exists).

- The link is removed on tose.sh, and nothing further is linked from this account.
- After you withdraw, the card shows "Authorization withdrawn. The link on tose.sh is being removed."
- Withdrawing succeeds even when tose.sh is unreachable: TOSE retries the removal in the background (every 5 minutes, up to 20 attempts).
- If you authorize again, a pending removal is cancelled.

## Delete the enquiry itself

Withdrawing removes the link, not the enquiry. To delete the enquiry, write to [privacy@tose.sh](mailto:privacy@tose.sh).

## For developers

Linking is account-level and session-only. API keys and OAuth grants, including the CLI and MCP, cannot use these routes, and no CLI command exists for it.

| Method and path | Purpose |
|---|---|
| `GET /api/account/lead-link` | Current status (`none`, `pending`, `linked`, `failed` or `revoked`), eligibility and the consent text |
| `POST /api/account/lead-link` | Authorize. Send `application/json` with `authorize: true` and the current `consent_version` (`415` for any other content type) |
| `DELETE /api/account/lead-link` | Withdraw (`204`) |

| Error | Meaning |
|---|---|
| `400 consent_required` | The request did not say `authorize: true` |
| `400 consent_outdated` | The consent text changed. Reload and agree again |
| `409 email_not_verified` | The account email is not verified yet. Confirm it from Settings, or sign in with a provider that verified it |
| `502 lead_signal_failed` | tose.sh could not be reached. The attempt is retried |
| `503 lead_link_unavailable` | Linking is not enabled on this installation |

Self-hosting operators: linking stays off unless `LEADS_HASH_SECRET` (16+ characters), `LEADS_LINK_URL` (`https`, tose-web's `/api/leads/link` URL) and `LEADS_LINK_TOKEN` (32+ characters) are all set. The secret and the token must equal the ones configured in tose-web (`TOSE_LEADS_HASH_SECRET`, `TOSE_LEADS_LINK_TOKEN`). With `APP_ENV=production`, the server refuses to start if only some of them are set, or if a value is too short or the URL is not `https`.
