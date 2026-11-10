# Cloud Desktops

A Cloud Desktop is a persistent Ubuntu desktop (XFCE) that runs in your TOSE workspace.
You can use it in the browser like a normal computer, and an AI agent can drive the same
desktop over the REST API: take screenshots, click, type, run terminal commands and read or
write files.

Typical uses:

- A long-lived browser profile for an agent (logins, cookies and extensions survive restarts).
- A shared workspace where an agent works and a human checks in or takes over when needed.
- A disposable-feeling but persistent dev box that costs nothing in compute while asleep.

::: warning Status: Coming soon
Cloud Desktops are built, and the `tose desktop` commands ship in CLI 0.1.3, but the feature is
not switched on in production yet. It is enabled per TOSE installation: if the `desktops`
endpoints return 404 for your workspace, the feature is not enabled. The dashboard then hides
**Cloud desktops** from the sidebar.
:::

## How it works

Each desktop has:

- **A persistent disk** mounted at `/home/ubuntu`. Everything you save in the home folder,
  including browser profiles, stays there across sleep and wake.
- **Compute** (CPU and RAM) that exists only while the desktop is running.
- **One control lease** shared between humans and agents. Whoever holds the lease can send
  input; others can still watch.

### Lifecycle states

| Status | Meaning |
|--------|---------|
| `provisioning` | Disk and resources are being created |
| `starting` | The desktop is booting |
| `running` | Ready to use, compute is billed |
| `sleeping` | Compute released, disk kept |
| `sleeping_failed` | A sleep attempt did not complete; retry `sleep` |
| `waking` | Booting again on the same disk |
| `error` | Something failed; see `last_error` and the events log |
| `deleting` | The desktop and its disk are being removed |

Every lifecycle change (create, wake, sleep, delete) is an **operation** with its own id and
status (`pending`, `running`, `succeeded`, `failed`). Only one operation runs per desktop at a
time. Sending wake (or sleep) again while one is in flight returns the same operation instead
of starting another, so retries are safe.

## Create a desktop

You need the **admin** role in the workspace and the id of a server to run on.

With the CLI:

```bash
tose desktop create dev --server <server-id> --cpu 2 --ram 4 --disk 20 \
  --resolution 1920x1080 --auto-sleep 30
```

With the API:

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=tose_sk_your_api_key
export WS=my-workspace

curl -X POST "$TOSE_API/api/workspaces/$WS/desktops" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "name": "dev",
    "server_id": "<server-id>",
    "cpu": "2",
    "ram": "4",
    "disk_size_gi": 20,
    "resolution": "1920x1080",
    "auto_sleep_minutes": 30
  }'
```

The request returns `202 Accepted` with `{desktop, operation}`. Poll the operation (or run
`tose desktop status dev`) until the desktop is `running`.

If the disk cannot be created, provisioning fails and the desktop moves to `error`; it never
starts without its persistent disk.

## Sleep and wake

**Sleep** stops the desktop's compute and releases its CPU and RAM. The disk is kept.

**Wake** starts the desktop again on the **same disk** with the same identity: your files,
installed packages in the home folder and browser profiles are where you left them.

::: warning No RAM hibernation
Sleep does not save memory. Open windows, unsaved documents and running processes are lost
when a desktop sleeps. Save your work to disk first. After wake, the desktop boots fresh from
its disk.
:::

```bash
tose desktop sleep dev --wait
tose desktop wake dev --wait
```

Auto-sleep: when `auto_sleep_minutes` is set, a desktop that has had no activity for that many
minutes is put to sleep automatically.

### Billing

- **Compute** is billed per running second while the desktop runs. After a confirmed sleep,
  compute charges stop.
- **The disk is billed for as long as the desktop exists**, whether running or sleeping, at the
  [persistent disk](/guide/persistent-disks) rate. It appears in the workspace volumes list as a
  `desktop` disk and can be grown there. Delete the desktop to stop disk charges.

## Human and agent control

Access to a running desktop goes through a **session**. A session is created with a
controller type:

- `human`: a person using the desktop in the dashboard (browser VNC viewer).
- `agent`: a program or AI agent using the REST actions.

A desktop has **one control lease**. The session that holds it can send input (click, type,
key, scroll, terminal, file read and write, screenshot) and watch the screen. Other sessions get
`403` until they take over. API keys can only open `agent` sessions. A session ends when its holder
loses access to the workspace and after 12 hours at most.

### Takeover

To take control while someone else holds the lease, create a session with
`"takeover": true`. The previous holder loses the lease and its input actions are rejected
from then on. This is how a human steps in to help an agent (for example to solve a login
challenge) and how the agent resumes afterwards.

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"controller": "human", "takeover": true}'
```

Release the lease by deleting your session when you are done.

## Driving a desktop from an agent

1. Make sure the desktop is `running` (wake it if needed).
2. Create an agent session.
3. Send actions with the `session_id`.
4. Delete the session.

```bash
DESKTOP_ID=<desktop-id>

# 1. Open an agent session
SESSION_ID=$(curl -s -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"controller": "agent"}' | jq -r '.session.id')

ACTIONS="$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/actions"

# 2. Take a screenshot (returns {image_base64, mime})
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"screenshot\"}" \
  | jq -r '.image_base64' | base64 -d > screen.png

# 3. Click, type and press keys
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"click\", \"x\": 640, \"y\": 360}"
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"type\", \"text\": \"hello\"}"
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"key\", \"keys\": \"ctrl+s\"}"

# 4. Run a terminal command (returns {stdout, stderr, exit_code})
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"terminal.exec\", \"command\": \"ls -la ~\", \"timeout_seconds\": 30}"

# 5. Write and read a file under /home/ubuntu
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"file.write\", \"path\": \"/home/ubuntu/notes.txt\", \"content_base64\": \"$(printf 'hi' | base64)\"}"
curl -s -X POST "$ACTIONS" -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"action\": \"file.read\", \"path\": \"/home/ubuntu/notes.txt\"}" \
  | jq -r '.content_base64' | base64 -d

# 6. Release the session
curl -s -X DELETE "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions/$SESSION_ID" \
  -H "X-API-Key: $TOSE_API_KEY"
```

The CLI wraps the common cases and handles the session for you:

```bash
tose desktop screenshot dev --out screen.png
tose desktop exec dev -- ls -la /home/ubuntu
```

See the [Desktops API reference](/api/desktops#actions) for every action and its parameters.

## Security

- **Raw VNC is never exposed publicly.** Desktops have no public address. The screen stream
  only reaches you through the TOSE session gateway.
- **Sessions use short-lived tokens.** Creating a session returns a token bound to that
  session; the gateway accepts only that token, and it stops working when it expires or the
  session is deleted. Treat it like a password and do not share it.
- **Input requires the lease.** Only the current lease holder can send input actions.
- **File access is confined** to `/home/ubuntu`; paths outside it are rejected.
- Desktops run with a hardened container profile, and network egress to cloud metadata and
  private networks is blocked.
- Lifecycle changes are recorded in the desktop's audit
  [events log](/commands/desktop#tose-desktop-events).

## Retention

- **Desktops are never deleted automatically.** A desktop and its disk are removed only when
  a workspace admin deletes it explicitly, confirming by name.
- **Low balance only sleeps desktops.** If your workspace runs out of credit, running desktops
  are put to sleep to stop compute charges. Disks are kept, and you can wake the desktops after
  topping up.
- A workspace cannot be deleted while it still contains desktops. Delete them first.

## Related

- [`tose desktop` commands](/commands/desktop)
- [Desktops API reference](/api/desktops)
