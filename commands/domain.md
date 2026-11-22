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
example.com                              active     active     verified               yes
www.example.com                          active     active     verified
api.example.com                          pending    pending    pending_verification
```

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
      "dns_status": "active",
      "ssl_status": "active",
      "is_default": true
    },
    {
      "id": "dom_def456",
      "domain": "www.example.com",
      "dns_status": "active",
      "ssl_status": "active",
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

Point the domain at TOSE before or after you add it. If it already resolves to its `target_ip` when you add it, it is verified, routed and given a certificate at once:

```bash
$ tose domain add example.com

✓ Domain example.com added
  DNS Status: active
  SSL Status: pending
  Verification: verified
```

Otherwise it is `pending_verification`, and the command prints the A record to create:

```bash
$ tose domain add example.com

✓ Domain example.com added
  DNS Status: pending
  SSL Status: pending
  Verification: pending_verification

  Point the domain at TOSE:
    A    example.com  ->  <target_ip>
  The domain is not routed until it is verified. Then run: tose domain verify example.com
```

### After Adding a Domain

Point the domain at the `target_ip` shown for it at your DNS provider:

```
Type:  A
Name:  example.com (or subdomain)
Value: <target_ip shown for the domain>
```

A CNAME whose chain resolves to `target_ip` works too. The `target_ip` is printed by `tose domain add`, and shown in the dashboard's Add Custom Domain dialog and in the API response for the domain. It is the ingress address of the environment that serves the project: for a development project it is the development server's address, not the production one. Each hostname is its own domain, so add `example.com` and `www.example.com` separately.

Then run `tose domain verify <domain>`. No TXT record is needed. Until the domain is verified it is not routed and gets no certificate. A domain behind a DNS proxy, which cannot resolve to `target_ip`, can be verified by the TXT record in `verification_record` instead (see `tose domain add --json`). See [Custom domains and verification](/guide/custom-domains).

When you remove a domain from TOSE, also remove its DNS record: a hostname that points at TOSE and has no verified owner can be claimed by any workspace, and so can the names under a wildcard record that points at TOSE. See [Remove DNS records you no longer use](/guide/custom-domains#remove-dns-records).

Once the domain is verified, it is routed and an SSL certificate is provisioned; `dns_status` is `active` once the domain resolves to `target_ip`. SSL shows active only when the certificate is Ready.

### JSON Output

```json
{
  "success": true,
  "data": {
    "id": "dom_abc123",
    "domain": "example.com",
    "dns_status": "pending",
    "ssl_status": "pending",
    "is_default": false,
    "target_ip": "203.0.113.10",
    "verification_status": "pending_verification",
    "verification_record": {
      "type": "TXT",
      "name": "_tose-challenge.example.com",
      "value": "<token>"
    }
  }
}
```

`verification_record` is present only while the domain is pending, and is needed only for a domain that cannot resolve to `target_ip`.

---

## tose domain verify

Verify a pending custom domain and refresh the DNS and SSL status of a verified one.

### Synopsis

```bash
tose domain verify <domain>
```

### Usage

TOSE checks that the domain resolves to its `target_ip` (A or AAAA record, or a CNAME chain). When it does, the domain is verified, routed and its certificate requested:

```bash
$ tose domain verify example.com

✓ Domain example.com verified
  Verification: verified
  DNS Status: active
  SSL Status: pending
  The certificate is still being issued. Run again to check: tose domain verify example.com
```

When it does not, the API answers `422 DOMAIN_VERIFICATION_FAILED`, and the command prints its message, which names what the domain resolves to now and where to point it, together with `target_ip` and the `resolved` addresses. Fix the DNS record, wait for it to propagate, then run the command again. Run it again later on a verified domain to see when SSL becomes active.

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

::: warning
Removing a domain does not change your DNS. Delete its A or CNAME record at your DNS provider too, or another workspace can add and verify the hostname while it still points at TOSE.
:::

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
| `active` | The domain resolves to its `target_ip` |
| `pending` | Waiting for DNS to point at `target_ip` |

### SSL Status

| Status | Description |
|--------|-------------|
| `active` | The SSL certificate is Ready |
| `pending` | Certificate is being provisioned |

### Verification Status

| Status | Description |
|--------|-------------|
| `verified` | The domain points at `target_ip` (or its TXT record was found); it is routed |
| `pending_verification` | Not routed yet; point the domain at `target_ip`, then run `tose domain verify` |

::: tip
DNS propagation can take up to 48 hours, but usually completes within a few minutes. SSL certificates are issued automatically once the domain is verified.
:::

## Related Commands

- [`tose open`](/commands/open) - Open project URL (uses default domain)
- [`tose status`](/commands/status) - Check project status
