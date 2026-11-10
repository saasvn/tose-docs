# tose domain

Manage custom domains for your project.

## tose domain list

List all domains configured for the project.

### Synopsis

```bash
tose domain list [project]
```

### Usage

```bash
$ tose domain list

DOMAIN                                   DNS        SSL        VERIFICATION           DEFAULT
example.com                              ok         ok         verified               yes
www.example.com                          ok         ok         verified
api.example.com                          pending    pending    pending_verification
```

`VERIFICATION` shows `verified` or `pending_verification`. A domain that is still pending is not routed; run [`tose domain verify`](#tose-domain-verify).

### JSON Output

```bash
$ tose domain list --json
```

```json
{
  "success": true,
  "data": [
    {
      "id": "dom_abc123",
      "domain": "example.com",
      "dns_status": "ok",
      "ssl_status": "ok",
      "verification_status": "verified",
      "is_default": true
    },
    {
      "id": "dom_def456",
      "domain": "www.example.com",
      "dns_status": "ok",
      "ssl_status": "ok",
      "verification_status": "verified",
      "is_default": false
    }
  ]
}
```

---

## tose domain add

Add a custom domain to your project.

### Synopsis

```bash
tose domain add <domain>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<domain>` | Domain name to add (e.g., `example.com`) |

### Usage

```bash
tose domain add app.example.com
```

The command prints the TXT record and the A record to publish, then the command to run next.

### After Adding a Domain

A new domain is a claim until you prove you control its DNS. `tose domain add` prints two records to publish at your DNS provider:

1. A **TXT** record at `_tose-challenge.<domain>` whose value is the token shown.
2. An **A** record for the domain that points at the `target_ip` shown.

Then run [`tose domain verify`](#tose-domain-verify). Until the domain is verified it is not routed and gets no certificate. See [Custom domains and ownership verification](/guide/custom-domains).

Adding can fail with `DOMAIN_TAKEN` (409, another owner already verified this hostname) or `DOMAIN_RESERVED` (400, platform hosts such as `*.tose.sh`, `localhost` and IP addresses).

### JSON Output

With `--json` the result carries `verification_status: "pending_verification"`, the `verification_record` to publish and the `target_ip` for the A record.

---

## tose domain verify

Check the ownership TXT record of a domain, route it, and refresh its DNS and SSL status.

### Synopsis

```bash
tose domain verify <domain>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<domain>` | Domain name added with `tose domain add` |

### Usage

```bash
tose domain verify app.example.com
```

`verify` looks up the TXT record at `_tose-challenge.<domain>` (5-second timeout). When it carries the token, the domain becomes `verified`, is routed, and its certificate is requested. The command then refreshes DNS and SSL status. **Run it again** to check a certificate that is still being issued: SSL is active only when the certificate is Ready.

### Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `DOMAIN_VERIFICATION_FAILED` | 422 | The TXT record is missing or carries a different value. The record to publish is printed again. DNS changes can take a while to spread, so try again later. |
| `DOMAIN_DNS_LOOKUP_FAILED` | 422 | The DNS lookup itself failed. This is temporary and safe to retry. |
| `DOMAIN_TAKEN` | 409 | Another owner already verified this hostname. |
| `DOMAIN_RESERVED` | 400 | The hostname is a platform host, `localhost`, an IP address or a non-public name. |

`DOMAIN_VERIFICATION_FAILED` and `DOMAIN_DNS_LOOKUP_FAILED` both exit with code `2`. With `--json`, the record to publish is in `error.details.verification_record`:

```bash
tose domain verify app.example.com --json
# error.code: DOMAIN_VERIFICATION_FAILED
# error.details.verification_record: the record to publish
```

::: info
The CLI manages the domains of projects. Domains of installed apps (templates) are not managed by the CLI yet; use the dashboard or the API.
:::

---

## tose domain rm

Remove a custom domain.

### Synopsis

```bash
tose domain rm <domain> [-y]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<domain>` | Domain name to remove |

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--yes` | `-y` | Skip confirmation prompt |

### Usage

```bash
$ tose domain rm example.com

Remove domain example.com? Yes
✓ Removing domain example.com...
✓ Domain example.com removed
```

**Skip confirmation:**

```bash
$ tose domain rm example.com -y

✓ Removing domain example.com...
✓ Domain example.com removed
```

### JSON Output

```json
{
  "success": true,
  "data": {
    "removed": "example.com"
  }
}
```

## Domain Status Reference

### DNS Status

| Status | Description |
|--------|-------------|
| `ok` | DNS is correctly configured |
| `pending` | Waiting for DNS propagation |

### Verification Status

| Status | Description |
|--------|-------------|
| `verified` | The TXT record was checked; the domain is routed |
| `pending_verification` | The domain is not routed and has no certificate until `tose domain verify` succeeds |

### SSL Status

| Status | Description |
|--------|-------------|
| `ok` | SSL certificate is active |
| `pending` | Certificate is being provisioned |

::: tip
DNS propagation can take up to 48 hours, but usually completes within a few minutes. SSL certificates are automatically issued once DNS is verified.
:::

## Related Commands

- [Custom domains and ownership verification](/guide/custom-domains) - How the proof works
- [`tose open`](/commands/open) - Open project URL (uses default domain)
- [`tose status`](/commands/status) - Check project status
