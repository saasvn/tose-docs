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
example.com                              ok         ok         yes
www.example.com                          ok         ok
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
      "dns_status": "ok",
      "ssl_status": "ok",
      "is_default": true
    },
    {
      "id": "dom_def456",
      "domain": "www.example.com",
      "dns_status": "ok",
      "ssl_status": "ok",
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
```

### After Adding a Domain

You need to configure DNS to point to your TOSE project. Add a CNAME record:

```
Type:  CNAME
Name:  example.com (or subdomain)
Value: your-project.tose.sh
```

A new domain is a claim until you prove you control its DNS. Add the TXT record shown for it at `_tose-challenge.<domain>`, then verify it in the dashboard or with `POST .../domains/{domain_id}/verify`. Until it is verified the domain is not routed and gets no certificate. See [Custom domains and ownership verification](/guide/custom-domains).

Once the domain is verified and DNS propagates, the status will change from `pending` to `ok`, and an SSL certificate will be provisioned. SSL shows active only when the certificate is Ready.

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
