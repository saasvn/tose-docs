# Sign-up campaign attribution

TOSE can store where a new account came from, using anonymous campaign parameters sent when the
account is created. This page lists the accepted parameters, how they are checked, and what is
never stored.

## Where it applies

| Entry point | How to send the parameters |
|---|---|
| `POST /auth/register` | JSON body fields |
| `GET /auth/github` | Query string |
| `GET /auth/google` | Query string |

## Accepted parameters

| Parameter | Meaning |
|---|---|
| `utm_source` | Where the visit came from |
| `utm_medium` | Channel type |
| `utm_campaign` | Campaign name |
| `utm_term` | Search term or keyword |
| `utm_content` | Ad or link variant |
| `ref` | Free-text reference label |

Any other parameter is ignored.

```bash
curl -X POST https://api.tose.sh/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "username": "you",
    "password": "a-strong-password",
    "utm_source": "newsletter",
    "utm_medium": "email",
    "utm_campaign": "spring-launch"
  }'
```

### `ref` on OAuth sign-in

On `GET /auth/github` and `GET /auth/google`, `ref` is the **referral code** (see the referral
program). To send an attribution reference at the same time, pass it as `attr_ref`. If `attr_ref` is
missing or not valid, `ref` is also read as the attribution reference. On `POST /auth/register`,
the referral code is the separate `referral_code` field, so `ref` there is only attribution.

## How values are checked

Each value is checked on its own, so one invalid value never discards the valid ones.

- Plain text only, at most 64 characters, starting with a letter or digit. Letters, digits,
  spaces and `_ . + -` are allowed.
- Dropped: URLs, email addresses, UUIDs, phone numbers, and token-like values (long unbroken runs of
  letters and digits, or random-looking ids).

A dropped value is not an error. The request succeeds and the value is simply not stored.

## What happens to the values

- Stored once, when the account is created. The first touch wins.
- Later logins never change them.
- They are not returned by the API.
- On OAuth, the values travel inside the sign-in `state` and are checked again on the callback.

## Privacy boundary

- Lead ids, deletion tokens and contact details are never accepted through this path.
- Accounts are never matched to marketing leads by email address.
- Linking an account to a lead stays a staff action, done only after the person confirms.

## Related

- [Authentication](/api/authentication)
