# Cloud Harness

Cloud Harness is a template that runs coding agents and tools on your own Docker host, reached over
MCP with TOSE sign-in. You create an instance in your workspace, add its MCP endpoint to your MCP
client, and sign in with your TOSE account. Jobs that need Docker run on the instance's own
**docker host**, which costs nothing while it is idle.

::: info Availability
Cloud Harness is enabled per TOSE installation. If it is not in the template catalog and the
`runtimes` endpoints return 404 for your workspace, the feature is not enabled yet.
:::

## How it works

Each instance has:

- **The instance pod**: the Cloud Harness runner and the containers beside it. It runs from the
  first deploy until you stop or delete the instance.
- **A docker host**: a Docker engine in a sandboxed pod, used only by this instance. In the API it
  is the instance's [runtime](/api/runtimes). It wakes by itself when a job needs Docker and
  suspends when it has been idle, so there is no wake button.
- **Two disks**: the instance's state disk and the docker host's disk. Both are kept while the
  docker host is suspended and while the instance is stopped. They are deleted with the instance.

### Docker host states

| Status | Meaning |
|--------|---------|
| `cold` | Suspended: compute released, disk kept, nothing billed for compute |
| `waking` | Starting on its disk |
| `ready` | Running jobs; compute is billed per second |
| `suspending` | Stopping its compute |
| `suspend_failed` | A suspend did not complete; suspend again |
| `error` | Something failed; see `last_error` and the operations list |
| `deleting` | The docker host and its disk are being removed |

Every change (create, wake, suspend, delete) is an **operation** with its own status. The instance
page lists the recent ones, with who started each: a person, an API key, or TOSE itself.

## Create an instance

You need:

- the **owner** or **admin** role in the workspace;
- a positive wallet balance (there is no unlock fee, but an empty wallet cannot start new spend);
- room under the workspace's [instance limit](#instance-limit).

In the dashboard:

1. Open **Installed apps** in your workspace (under **Apps & templates**) and select **New Template**.
2. Choose **Cloud Harness**. The card shows the instance's costs and how
   many instances the workspace already has.
3. Enter a name and pick a size: 1 or 2 vCPU, 2 GB or 4 GB RAM. These are the only sizes Cloud
   Harness accepts.
4. Fill in the required settings:

   | Setting | What to enter |
   |---------|---------------|
   | `MODEL_GATEWAY_PROVIDER_API_KEY` | Your model provider API key. Only the model gateway on the docker host receives it. |
   | `MODEL_GATEWAY_PROFILES` | The model gateway profiles, as JSON: `{"version":1,"mode":"production","profiles":[...]}` |
   | `RUNNER_TOKEN` | A random secret of at least 32 characters, for example from `openssl rand -hex 32` |

   The provider key and the runner token are always stored encrypted and shown masked.
5. Select **Create & Deploy**. TOSE creates the instance and its docker host, saves the settings,
   then deploys the instance. You land on the deployment log.

The instance URL is assigned on the first deploy. It is shown on the instance page under
**Connect**.

## What it costs

An instance is pay-as-you-go, with no unlock fee:

- **The instance** is billed while it runs, at the compute rates for its size plus the fixed
  budget of the containers beside the runner. A stopped instance has no compute charge.
- **The docker host** is billed **per second while it is awake** and costs **$0 while cold**.
- **Both disks** are billed at the storage rate for as long as the instance exists, even while it
  is stopped.

The prices use the standard compute rate. The template catalog computes them for you, and
the dashboard shows them on the Cloud Harness card and, for the docker host, on the instance page.
See [Pricing](/guide/pricing#cloud-harness) for how each part is computed.

If the wallet runs out, TOSE stops running instances and suspends their docker hosts. Disks and
their data are kept.

### Instance limit

A workspace can have a limited number of Cloud Harness instances. The default limit is 5; your TOSE
installation may set another. The catalog entry's `max_instances` field and the Cloud Harness card
show the current limit. Delete an instance to make room; an instance that is being deleted still
counts until its docker host is gone.

## Sign in to an instance

1. Open the instance page and find **Connect**. It shows the **Instance URL** and the
   **MCP endpoint**, which is the instance URL followed by `/mcp`.
2. Add the MCP endpoint to your MCP client as a remote server.
3. The client sends you to TOSE. Sign in with your TOSE account and approve the connection.

Only these workspace members can sign in:

- workspace **owners** and **admins**;
- the member who **created** the instance;
- members an owner or admin has [given access](#grant-workspace-members-access).

Sign-in works only through the instance's default URL, the one shown under **Connect**. A custom
domain added to the instance does not accept TOSE sign-in. People outside the workspace cannot sign
in.

## Grant workspace members access

Owners and admins manage who else may sign in, on the instance page's **Access** tab:

- **Always allowed** lists the owners, admins and the instance's creator. Their access comes from
  their role and cannot be removed here.
- **Members given access** lists the other members who may sign in. Choose a member and select
  **Add member** to grant access, or **Remove** to take it away.

Removing someone stops new sign-ins at once. An access token already issued keeps working for up to
10 minutes. Removing a member from the workspace also removes their access to every instance, and a
member invited back later starts without access.

Every member can see the Access tab; only owners and admins can change it.

The same list is available over the API:

| Method | Path | Role | Response |
|--------|------|------|----------|
| `GET` | `/templates/{template_slug}/access` | member | `200` `{grants: [...]}` |
| `POST` | `/templates/{template_slug}/access` | admin | `201` grant, or `200` if the member already has access |
| `DELETE` | `/templates/{template_slug}/access/{user_id}` | admin | `204` |

Paths are relative to `https://api-v2.tose.sh/api/workspaces/{workspace_slug}`. Granting takes
`{"user_id": "<user-id>"}`, and the user must be a member of the workspace. An API key needs the
`workspace:read` scope to read the list and `members:manage` to change it.

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=ws_your_api_key
export WS=my-workspace

curl -X POST "$TOSE_API/api/workspaces/$WS/templates/my-harness/access" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"user_id": "<user-id>"}'
```

## The docker host

The **Docker host** panel on the instance page shows its status, last activity, price while ready,
CPU and RAM, and recent operations.

- It **wakes by itself** when a job needs Docker. Waking needs a positive wallet balance.
- It **suspends by itself** after a period without activity. Containers running on it stop; its
  disk is kept.
- **Suspend** stops it now, for example to stop compute charges at once. It wakes again when a job
  needs Docker.

To manage the docker host from a script, see the [Runtimes API](/api/runtimes).

## Delete an instance

Owners and admins can delete an instance from its page. Deleting stops its compute billing at once,
then removes, in the background, its pod, its docker host and both disks, its access list and the
connections signed in to it. Deleted disks cannot be recovered.

## Related

- [Runtimes API](/api/runtimes)
- [Pricing](/guide/pricing#cloud-harness)
