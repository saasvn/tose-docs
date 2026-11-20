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

DOMAIN                                   DNS        SSL        DEFAULT
example.com                              active     active     yes
www.example.com                          active     active
api.example.com                          pending    pending
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

```bash
$ tose domain add example.com

✓ Adding domain example.com...
✓ Domain example.com added
  DNS Status: pending
  SSL Status: pending
  Verification: pending_verification

  Prove you own this domain by publishing a DNS record:
    TXT  _tose-challenge.example.com  =  <token>
    A    example.com  ->  <target_ip>
  The domain is not routed until it is verified. Then run: tose domain verify example.com
```

### After Adding a Domain

You need to configure DNS to point to your TOSE project. Add an A record:

```
Type:  A
Name:  example.com (or subdomain)
Value: <target_ip shown for the domain>
```

The `target_ip` is printed by `tose domain add`, and shown in the dashboard's Add Custom Domain dialog and in the API response for the domain. Custom domains work on projects in production and development environments alike; for a development project the address is the development ingress, not the production one.

A new domain is a claim until you prove you control its DNS. Add the TXT record shown for it at `_tose-challenge.<domain>`, then verify it in the dashboard or with `POST .../domains/{domain_id}/verify`. Until it is verified the domain is not routed and gets no certificate. See [Custom domains and ownership verification](/guide/custom-domains).

Once the domain is verified and DNS propagates, `dns_status` will change from `pending` to `active`, and an SSL certificate will be provisioned. SSL shows active only when the certificate is Ready.

### JSON Output

```json
{
  "success": true,
  "data": {
    "id": "dom_abc123",
    "domain": "example.com",
    "dns_status": "pending",
    "ssl_status": "pending",
    "is_default": false
  }
}
```

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

### SSL Status

| Status | Description |
|--------|-------------|
| `ok` | SSL certificate is active |
| `pending` | Certificate is being provisioned |

::: tip
DNS propagation can take up to 48 hours, but usually completes within a few minutes. SSL certificates are automatically issued once DNS is verified.
:::

## Related Commands

- [`tose open`](/commands/open) - Open project URL (uses default domain)
- [`tose status`](/commands/status) - Check project status
