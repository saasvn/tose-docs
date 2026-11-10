# Custom domains and ownership verification

A custom domain is routed only after you prove you control its DNS. This page explains the proof, the statuses you will see, and what TOSE refuses. It applies to the domains of projects and of installed apps (templates).

## How verification works

1. **Add the domain** in the dashboard, with `tose domain add`, or with `POST /api/workspaces/{slug}/projects/{project_slug}/domains` (`POST .../templates/{template_slug}/domains` for an app). Only an owner or admin can add it.
2. TOSE records a claim with `verification_status: pending_verification` and returns a `verification_record`: a random token and the name to publish it at.
3. **Add a TXT record** at `_tose-challenge.<your-domain>` whose value is the token shown. Also point an A record at the `target_ip` shown.
4. **Click Verify**, or call `POST .../domains/{domain_id}/verify`. TOSE looks the TXT record up (5-second timeout). When it carries the token, the domain becomes `verified`, is routed, and its certificate is requested.

```bash
curl -X POST https://api.tose.sh/api/workspaces/my-team/projects/my-site/domains/$DOMAIN_ID/verify \
  -H "X-API-Key: $TOSE_API_KEY"
```

A pending domain is **not routed and gets no certificate**. Verification can fail with:

| Status and code | Meaning |
|-----------------|---------|
| `422 DOMAIN_VERIFICATION_FAILED` | The TXT record is missing or carries a different value. The response repeats the `verification_record` to publish. DNS changes can take a while to spread, so try again later. |
| `422 DOMAIN_DNS_LOOKUP_FAILED` | The DNS lookup itself failed. Try again. |
| `409 DOMAIN_TAKEN` | Another owner already verified this hostname. |

## One owner per hostname

A hostname has at most one verified owner across **all workspaces**, for projects and apps together. A pending claim blocks nobody, so nobody can hold a domain without controlling its DNS: the first claim to verify wins, and a later one gets `409 DOMAIN_TAKEN`. Adding a domain that is already on the same project returns `409 DOMAIN_ALREADY_ADDED`.

## What cannot be added

TOSE refuses with `400 DOMAIN_RESERVED`:

- platform hosts and their subdomains, such as `*.tose.sh`;
- `localhost`, IP addresses and non-public names (`.local`, `.internal` and similar).

A name that is not a valid hostname returns `400 DOMAIN_INVALID`. Names are trimmed, lower-cased, stripped of a trailing dot and converted to punycode first, so enter a bare hostname without a scheme, port, path or wildcard.

## Statuses

| Field | Values and meaning |
|-------|--------------------|
| `verification_status` | `pending_verification` until the TXT record is checked, then `verified`. |
| `dns_status` | `active` once the domain resolves to `target_ip`. |
| `ssl_status` | `active` only when the certificate is **Ready**. Call verify again to check a pending certificate. |

## Domains you added before

Domains attached before verification existed were marked `verified`, so live sites keep working without a TXT record. If the same hostname was attached both to a project and to an app, the oldest claim stays verified and the other one becomes `pending_verification` with a new token.

See also [`tose domain`](/commands/domain), the [Projects API](/api/projects) and the [OpenAPI contract](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
