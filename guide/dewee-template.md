# Dewee template runbook

This runbook covers the **Dewee 1-click template** that TOSE offers today: how to create and deploy it, what is secured and what is not yet, how MCP and OAuth behave on a deployed instance, what "running" means, and how to upgrade or roll back.

It describes the template as it exists now. Where a safeguard is still being built, the page says so and gives the manual step to take in the meantime. It is not the future `tose.yaml` registry; for that, see [Configuration File](/guide/configuration).

::: warning Not yet verified as a production one-click
The Dewee template is **experimental**. An end-to-end release gate (create, authenticate, WebSocket, MCP, persisted data, redeploy) has not passed yet, so TOSE does not label it verified. Read [Security contract](#security-contract) before you expose an instance to the Internet.
:::

## Choose the template

```bash
tose template catalog
```

The catalog entry for Dewee (`dewee`) has these defaults:

| Item | Value |
|------|-------|
| Port | `3000` (nginx, public) in front of the Dewee backend on `127.0.0.1:18790` |
| CPU | `1` or `2` vCPU. Default `1` |
| RAM | `2` or `4` GB. Default `2` |
| Replicas | Always `1`. The persistent disk can be mounted by one pod only |
| Default image | The tag shown by `tose template catalog` or `GET /available-templates`. It is a moving catalog default, not a digest |
| Database | An external PostgreSQL that you provide through `GOCLAW_POSTGRES_DSN` |

Any other CPU or RAM value is rejected with a `400` error. The catalog may show a newer image than the one your instance runs; see [Versions and upgrades](#versions-and-upgrades).

### Cost: unlock fee and wallet credit

Dewee is a paid template. Creating the first instance in a workspace requires a one-time unlock payment, and the full amount stays in your wallet as credit. Until the workspace is unlocked, `POST /workspaces/<slug>/templates` returns `402` with an `unlock_url`. The current fee comes from the API (`unlock_fee_vnd` in the catalog and in `GET /workspaces/<slug>/templates/unlock-status`), so this page does not repeat it. Compute and storage are billed from the wallet as described in [Pricing](/guide/pricing).

### Bring your own key (BYOK)

Dewee calls AI providers with keys that you configure inside the instance. The provider bills that usage. The TOSE wallet pays only for infrastructure.

## Create an instance

Creating, changing and deleting an instance needs the workspace **admin** role. Members can view it.

### Dashboard

1. Open **Templates** in your workspace and choose **Dewee**.
2. Pay the unlock fee if asked.
3. Pick CPU and RAM, then create.
4. Open **Environment** and set the three required variables (below).
5. Press **Deploy**.

### CLI

```bash
tose template create my-dewee --template dewee

# Secrets go through a file you alone can read, or stdin. Never inline.
install -m 600 /dev/null dewee.env
$EDITOR dewee.env        # GOCLAW_POSTGRES_DSN, GOCLAW_ENCRYPTION_KEY, GOCLAW_GATEWAY_TOKEN
tose template env set my-dewee --env-file dewee.env
shred -u dewee.env 2>/dev/null || rm -f dewee.env

tose template deploy my-dewee --wait
tose template info my-dewee
```

The three required variables are:

| Variable | Purpose |
|----------|---------|
| `GOCLAW_POSTGRES_DSN` | Connection string of your PostgreSQL |
| `GOCLAW_ENCRYPTION_KEY` | Key Dewee uses to encrypt its stored secrets |
| `GOCLAW_GATEWAY_TOKEN` | Token that protects the API and WebSocket. See below |

The `DEWEE_*` spellings (for example `DEWEE_GATEWAY_TOKEN`) are accepted as aliases and copied to the `GOCLAW_*` name at startup when the `GOCLAW_*` one is empty. Set one spelling, not both.

`tose template env list` masks values it recognizes as credentials (names containing `token`, `secret`, `password`, `api_key` and similar), which covers `GOCLAW_GATEWAY_TOKEN`. It does **not** mask `GOCLAW_POSTGRES_DSN` or `GOCLAW_ENCRYPTION_KEY` when you set them from a file or stdin, so those two values can be printed in plain text. Set them with the masked prompt instead (`tose template env set my-dewee GOCLAW_ENCRYPTION_KEY`) and avoid running `env list` on a shared screen or in CI logs. A fix is tracked in [tose-cli#40](https://github.com/saasvn/tose-cli/issues/40). See [`tose template`](/commands/template) for the full command reference.

## Security contract

The Dewee backend listens on `127.0.0.1`, but nginx publishes `/v1/*`, `/ws` and `/health` from the backend to the Internet. That changes what "local" means.

- **The gateway token is mandatory.** When `GOCLAW_GATEWAY_TOKEN` is empty, Dewee can fall back to a local no-auth mode that grants admin or operator rights to any caller it thinks is local. Behind a reverse proxy every request looks local, so an instance without a token can be reachable without authentication.
- **Today the platform does not block a deploy with a missing token.** The catalog lists the variable as required, but the API does not enforce it. Fail-closed enforcement and automatic token generation are in progress ([tose-app#272](https://github.com/saasvn/tose-app/issues/272)). Until it ships, you must set a strong random token yourself before the first deploy.
- **Generate the token locally**, for example `openssl rand -hex 32`, and put it only in the protected env file or stdin. Do not paste it into chat, tickets or shell history.
- **Stored secret names.** The three variables above are stored encrypted per template instance. `tose template info` masks them. See the note above about `env list`. Treat any value shown by an explicit reveal action as exposed and rotate it.
- **Never expose the internal bridge.** `/mcp/bridge` is for in-instance use and authenticates with the gateway token. Do not publish it through your own proxy, custom domain rule or tunnel.
- **Roles.** Operator and admin rights inside Dewee come from its own tokens and users. TOSE workspace roles control who can change the template and its environment.

### Check an instance that may have no token

You do not need to reveal any credential to find out.

1. List the variable names only:

   ```bash
   tose template env list my-dewee
   ```

   Look for `GOCLAW_GATEWAY_TOKEN` (or `DEWEE_GATEWAY_TOKEN`). If it is absent, treat the instance as exposed.
2. Request an authenticated route without any token. Replace the host with the one from `tose template info`:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://<your-instance-host>/v1/agents
   ```

   `401` or `403` is expected. A `200` means the API answered without credentials.
3. If the token is missing, set a new one with `tose template env set my-dewee --env-file ...` and redeploy. Existing browser sessions and API clients that used the old token stop working, so plan the change.
4. Rotate any provider key, database password and other secret that the instance held, because an unauthenticated admin could have read them.

## MCP and OAuth

Dewee exposes two different MCP surfaces. Do not confuse them.

| Route | Audience | Status on the TOSE template |
|-------|----------|-----------------------------|
| `/mcp/server` (legacy `/mcp`) | Public MCP clients, with OAuth discovery | **Not routed yet.** The template's nginx forwards only `/v1/`, `/ws` and `/health`, so these paths fall through to the web app and return its HTML page instead of an MCP response. Public routing is in progress ([tose-app#273](https://github.com/saasvn/tose-app/issues/273)) |
| `/mcp/bridge` | Internal, gateway-token only | Must never be public |

Until the proxy fix is released, do not configure an MCP client against the instance's public host, and do not work around it with a manual proxy rule. After the fix ships, connect through the public route only and expect these results:

- `POST /mcp/server` with a valid credential returns a JSON-RPC response. With no or a bad token it returns `401` with a `WWW-Authenticate` challenge.
- OAuth discovery metadata is served from the same public host.
- `/mcp/bridge` from the Internet is denied.

Troubleshooting:

| Symptom | Likely cause |
|---------|--------------|
| An HTML page where JSON is expected | The path is not proxied to the backend yet |
| `401` with a challenge | Credential missing or wrong. Re-run the client's OAuth sign-in |
| Discovery works but the client cannot call tools | Public URL or scheme in the metadata does not match the domain you use |

This is the Dewee instance's own MCP server. For the connector to TOSE itself, see [MCP clients](/mcp/clients) and [Protocol, OAuth and scopes](/mcp/oauth).

## Health and readiness

What the statuses mean:

- `running` means the pod is ready as Kubernetes counts readiness. The template container has no startup, readiness or liveness probe yet, and the start script waits up to 90 seconds for the backend `/health`, then starts nginx even if the backend never answered. So `running` does **not** prove that the API responds ([tose-app#274](https://github.com/saasvn/tose-app/issues/274)).
- The container image has its own Docker `HEALTHCHECK` on `http://127.0.0.1:18790/health`. This checks the backend, not the public route through nginx.

Check an instance yourself:

```bash
tose template info my-dewee                  # status and links
tose template logs my-dewee -f               # live container log (needs status running)
tose template logs my-dewee --build -d <deployment-id>   # rollout log
curl -s -o /dev/null -w '%{http_code}\n' https://<your-instance-host>/health
```

| Symptom | What to check |
|---------|---------------|
| `502` from the public host | Backend is not up behind nginx. Read the live log for crashes, a bad `GOCLAW_POSTGRES_DSN`, or a failed migration |
| `/health` fine but the web UI cannot connect | `/ws` upgrade blocked by a proxy in front of TOSE, or a wrong token |
| Log ends with `Database upgrade failed` | The migration failed and the container exits. See [Upgrades](#versions-and-upgrades) |
| `Backend ready after Ns` never appears | The backend did not come up within 90 seconds. Check the database reachability |
| First sign-in | Open the dashboard link and complete the one-time bootstrap sign-in. The CLI never prints the bootstrap credential |
| Create refused with HTTP `402` | Unlock fee unpaid or wallet balance too low. See [Pricing](/guide/pricing) |

## Versions and upgrades

- **Image.** An instance runs the image stored on it. A plain `tose template deploy` (`image` mode) keeps that image and does not upgrade you. `tose template info` shows the deployed, configured and available images and whether an update exists. Move to the catalog version only with `tose template deploy --upgrade`, and pass `--expected-image` (the `Configured:` line) so the deploy fails if the image changed meanwhile. `--mode build` does not replace the image.
- **Tags are not digests.** A tag can be re-pushed. For a reproducible record, resolve the digest of the image you run and store it with your own notes.
- **Auto-upgrade is on by default.** On every start with `GOCLAW_POSTGRES_DSN` set, the container runs `dewee upgrade` and refuses to start if it fails. Set `GOCLAW_AUTO_UPGRADE=false` if you want to run the upgrade yourself in a window you choose.
- **Back up first.** Your PostgreSQL is yours: TOSE does not snapshot it. Before any version change, take a backup and restore it to a scratch database once to prove it works. Back up the persistent disk data you need too.
- **Rollback is not symmetric.** `tose template deploy --rollback <deployment_id>` runs an earlier image again, but it does **not** revert the database schema or data. A migration that has run may be incompatible with the older image. To go back safely, restore the database backup together with the older image.
- **Downtime.** The template runs one replica on a disk that one pod can mount, and redeploys replace the pod. Expect an interruption during a deploy. TOSE does not promise zero downtime for this template.
- **Opt-in.** Upgrade only when you choose to (`--upgrade`), from a backup, outside peak use. A catalog change does not upgrade you.

### Upgrade and roll back from the dashboard {#dashboard-upgrade-and-rollback}

The template page in the dashboard has an **Image** section with the same controls as the CLI. It shows three images: **Last deployment** (what runs now), **Configured** (the image stored on the template, used by the next plain deploy) and **Available** (the catalog version). An **Update available** badge appears when the catalog version differs from what you run, and **Up to date** when it does not.

Three separate actions never do each other's job:

| Action | What it sends | Result |
|--------|---------------|--------|
| **Deploy** | `image_source=custom` | Redeploys the stored image. It does not upgrade. With no stored image yet, it deploys the catalog version and stores it |
| **Upgrade to available version** | `image_source=catalog` | Deploys the catalog version and replaces the stored image |
| **Roll back to an earlier version** | `rollback_to=<deployment id>` | Runs the image of an earlier deployment and stores it |

The dialog for each action names the image it will run. Every request also sends `expected_image` (the **Configured** image you were looking at) whenever an image is stored. If someone changed the image since you opened the page, the request is refused with `409`; reload the page and decide again. While another deployment is in progress the actions are disabled.

Rolling back shows a warning before you confirm: **rolling back the image does not roll back the database schema or data.** If the newer version migrated them, the older image may fail or misread them, so restore a database backup first. See [Back up first](#versions-and-upgrades).

The rollback list offers only earlier deployments that ran successfully (status `running` or `stopped`, and finished), newest first, one entry per image, up to eight, and without the image you run now. A failed build is never offered because its image was never pushed. The API applies the same rule and returns `404` for any other deployment ID. See [Template deploy API](/api/templates#rollback).

## Release gate and compatibility

TOSE publishes a Dewee version as verified only after an end-to-end run passes against a staging cluster: create, authenticate over the public domain, WebSocket, MCP, persisted data after restart, redeploy and rollback, plus the negative cases above ([tose-app#276](https://github.com/saasvn/tose-app/issues/276)).

| Field | Current value |
|-------|---------------|
| Dewee source | `https://github.com/nextlevelbuilder/dewee`, branch `dev` |
| Image tag | See `tose template catalog` |
| Image digest, Dewee commit, TOSE revision, flags | Not published yet |
| Last validated date | None |
| Support level | **Experimental** |

When a verified run exists, this table gains the digest, commit, TOSE revision, date and the word *verified*. Do not treat a template as one-click verified before that.

## Staged rollout checklist

1. Create an instance in a non-production workspace.
2. Set the three variables from a protected file. Confirm the token is present with `tose template env list`.
3. Deploy with `--wait`. Confirm `/health`, then confirm an unauthenticated `/v1/agents` request is refused.
4. Sign in through the dashboard link, create an agent, restart the instance and confirm the agent is still there.
5. Take and test a database backup.
6. Only then use it for real data.

## Related

- [`tose template`](/commands/template)
- [Environment Variables](/guide/environment)
- [Persistent Disks](/guide/persistent-disks)
- [Pricing](/guide/pricing)
- [MCP clients](/mcp/clients)
