# Custom domains and verification

A custom domain is routed only once its DNS points at TOSE. You point the domain at the `target_ip` shown for it, the ingress address of the environment that serves it, and TOSE verifies the domain when it resolves there. No TXT record is needed. This works the same way for projects and installed apps (templates), in production and in development; for a development project, `target_ip` is the address of its development server, so a domain is routed on the environment it points at. The one exception is a domain one label below the base domain of a workspace's development environment: its DNS belongs to the environment, so it is verified when created. This page explains the steps, the statuses you will see, and what TOSE refuses.

## How verification works

1. **Add the domain** in the dashboard, with `tose domain add`, or with `POST /api/workspaces/{slug}/projects/{project_slug}/domains` (`POST .../templates/{template_slug}/domains` for an app). Only an owner or admin can add it. Each hostname is its own domain: add `example.com` and `www.example.com` separately.
2. **Point the domain at `target_ip`** at your DNS provider: an A record for the hostname, or a CNAME whose chain resolves to that address. `target_ip` is in the response, in `tose domain add` output and in the dashboard's Add Custom Domain dialog.
3. **Click Verify**, or call `POST .../domains/{domain_id}/verify`. TOSE looks the hostname up (5-second timeout). When it resolves to `target_ip` through an A or AAAA record or a CNAME chain, the domain becomes `verified`, is routed, and its certificate is requested.

If the domain already points at `target_ip` when you add it, the add response is already `verified` and the domain is routed and certified at once, so you can skip step 3. Otherwise it starts as `pending_verification`.

```bash
curl -X POST https://api.tose.sh/api/workspaces/my-team/projects/my-site/domains/$DOMAIN_ID/verify \
  -H "X-API-Key: $TOSE_API_KEY"
```

A pending domain is **not routed and gets no certificate**. Verification can fail with:

| Status and code | Meaning |
|-----------------|---------|
| `422 DOMAIN_VERIFICATION_FAILED` | The domain does not resolve to `target_ip`. The message says what it resolves to now and where to point it; the response also carries `target_ip` and `resolved`, the list of addresses TOSE found (`null` when the lookup found no address). DNS changes can take a while to spread, so try again later. |
| `422 DOMAIN_DNS_LOOKUP_FAILED` | Only for a domain with no `target_ip`, which only the TXT record can verify: the DNS lookup itself failed. Try again. |
| `409 DOMAIN_TAKEN` | Another owner already verified this hostname. |

```json
{
  "error": "shop.example.com resolves to 198.51.100.7. Point an A record (or a CNAME that resolves there) at 203.0.113.10, wait for DNS to propagate, then verify again.",
  "code": "DOMAIN_VERIFICATION_FAILED",
  "target_ip": "203.0.113.10",
  "resolved": ["198.51.100.7"],
  "verification_record": { "type": "TXT", "name": "_tose-challenge.shop.example.com", "value": "<token>" }
}
```

### TXT record for proxied DNS {#txt-record}

A domain that cannot resolve to `target_ip`, for example one behind a DNS proxy such as Cloudflare's orange-cloud mode, can be verified by a TXT record instead. A pending domain carries `verification_record` in the API (list, add and failed verify responses): publish a TXT record at `_tose-challenge.<your-domain>` whose value is the token shown, then verify. The dashboard no longer shows this record; read it from the API or the CLI's `--json` output. Verify accepts either proof: the domain resolving to `target_ip`, or the TXT record carrying the token.

### Remove DNS records you no longer use {#remove-dns-records}

Pointing a domain at TOSE shows that whoever controls its DNS sent it to TOSE, not which workspace they meant: the ingress address is shared by every workspace of an environment. A hostname that points at it and has no verified owner can therefore be added and verified by any workspace. So:

- when you remove a domain from TOSE, also remove its A or CNAME record;
- a wildcard record (`*.example.com`) pointing at TOSE lets any of its names be claimed, so create a DNS record for each name you use instead of the wildcard;
- add the domain as soon as you point it: until it is added and verified, another workspace can claim it. Adding a domain that already points at TOSE verifies it at once.

## One owner per hostname

A hostname has at most one verified owner across **all workspaces**, for projects and apps together. A pending claim blocks nobody, so nobody can hold a domain whose DNS does not point at TOSE: the first claim to verify wins, and a later one gets `409 DOMAIN_TAKEN`. Adding a domain that is already on the same project returns `409 DOMAIN_ALREADY_ADDED`.

## What cannot be added

TOSE refuses with `400 DOMAIN_RESERVED`:

- platform hosts and their subdomains, such as `*.tose.sh`;
- `localhost`, IP addresses and non-public names (`.local`, `.internal` and similar).

On a development project, the development base domain itself and any name more than one label below it are refused with `400` ("Development domains must be one label below the development base domain").

A name that is not a valid hostname returns `400 DOMAIN_INVALID`. Names are trimmed, lower-cased, stripped of a trailing dot and converted to punycode first, so enter a bare hostname without a scheme, port, path or wildcard.

## Statuses

| Field | Values and meaning |
|-------|--------------------|
| `verification_status` | `pending_verification` until the domain resolves to `target_ip` (or its TXT record is found), then `verified`. |
| `dns_status` | `active` once the domain resolves to `target_ip`. |
| `ssl_status` | `active` only when the certificate is **Ready**. Call verify again to check a pending certificate. |

## A certificate that never issues {#stuck-certificate}

A verified domain whose certificate is still not Ready after 7 days is checked again by TOSE:

- If the domain resolves to a TOSE address or to Cloudflare, nothing changes. Your inbox gets a `domain.certificate_stuck` event with the addresses TOSE saw.
- Otherwise (no record, or another host), the domain goes back to `pending_verification` with `ssl_status` `failed`, keeping its TXT token. It is removed from routing and its certificate request stops. Your inbox gets a `domain.certificate_abandoned` event naming what DNS returned.

Point the DNS at TOSE and click **Verify** again (or `POST .../domains/{domain_id}/verify`); that routes the domain and requests a new certificate. No data is deleted.

## Domains you added before

Domains attached before verification existed were marked `verified`, so live sites keep working without being verified again. If the same hostname was attached both to a project and to an app, the oldest claim stays verified and the other one becomes `pending_verification` with a new token.

See also [`tose domain`](/commands/domain), the [Projects API](/api/projects) and the [OpenAPI contract](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
