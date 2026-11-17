---
title: "Steer a running agent run"
description: "Send an extra instruction to an Agent Runtime run that is already executing, without a new run or a restart, and read honestly whether the engine received it."
---

# Steer a running agent run

Steering sends an extra instruction to an Agent Runtime run that is **already executing**: no new run, no new session, no restart and no cancel. For example: "Keep the current database, only change the API and run the tests." Sending a message starts a run, cancel stops it, and steer adjusts the one in progress. There is no "wait until the agent is idle, then send" mode.

This is for agents of the Agent Runtime (`/api/workspaces/{slug}/agents`). Tasks of curated coding agents ([Delegate tasks to a coding agent](/guide/agent-tasks)) cannot be steered.

::: warning Availability
- The instance must run the Agent Runtime (`AGENT_RUNTIME_ENABLED`) with prepaid admission. It is not generally available.
- Only an engine whose `capabilities.steer` is `true` accepts a steer. Pi is the only Agent Runtime engine today, and it steers. Steering for further engines is tracked in tose-app [#538](https://github.com/saasvn/tose-app/issues/538); do not expect the same behaviour across engines.
- The Pi agent image still needs a staging canary with a user's own provider key before it counts as ready for customer runs.
:::

## How it works {#how-it-works}

1. You send the instruction. TOSE stores it as `queued` and answers `202`. That is all `202` means.
2. The worker that runs the run picks queued instructions up one at a time, in order, and hands each one to the engine.
3. Pi reads it at its next safe point: after the current assistant turn finishes its tool calls, before the next model call. A tool that is already running is **not interrupted**. One instruction is read per model call.
4. The instruction is data for the agent. It grants no extra permission, and the engine's own tool and permission checks stay the same.

Steering is accepted only when the engine process serving this run confirmed, when it started, that it can steer. Until then a steer answers `409 STEER_NOT_READY`: retry shortly.

## Statuses {#statuses}

| Status | Meaning |
|--------|---------|
| `queued` | Stored, not yet handed to the engine. |
| `dispatching` | Handed over, waiting for the engine to confirm. |
| `delivered` | The engine confirmed it queued the instruction. This **never** means the model followed it. |
| `rejected` | The engine did not queue it: it never reached the engine, or the engine refused it. |
| `uncertain` | It may have reached the engine, but this could not be confirmed, or it was confirmed and the run ended before the model read it. It is never sent again. |

A `rejected` or `uncertain` instruction carries a code:

| Code | Status | When |
|------|--------|------|
| `RUN_ENDED` | `rejected` | The run ended before the instruction was sent. |
| `RUN_CANCELING` | `rejected` | A cancel, a forced sleep or deleting the agent took effect first. |
| `REVISION_CHANGED` | `rejected` | The agent was updated after the run started. |
| `ACCESS_REVOKED` | `rejected` | The person or credential that sent it lost access before it was sent (see [Access is checked again](#access-is-checked-again)). |
| `ENGINE_REJECTED` | `rejected` | The engine refused it, or it could not be handed over. |
| `RUN_NOT_ACTIVE` | `rejected` | The engine's loop had already stopped when the instruction arrived. |
| `NOT_SUPPORTED` | `rejected` | The engine process serving the run does not steer. |
| `NO_ACK` | `uncertain` | No confirmation arrived before the run ended. |
| `UNREAD` | `uncertain` | The engine confirmed it, but the run ended before the model read it. |
| `RUN_OUTCOME_UNKNOWN` | `uncertain` | The run ended unexpectedly, so whether the model read it is unknown. |

## Access is checked again before it is sent {#access-is-checked-again}

Each instruction records who sent it. Just before the worker hands it to the engine, TOSE checks again that:

- the sign-in session, API key or connected app that sent it is still live (not signed out, expired or revoked);
- that person is still a member of the workspace;
- their current role and scopes still allow `agents:control`.

If any check fails, the instruction is `rejected` with `ACCESS_REVOKED`, in its place in the queue, and later ones are still handled in order. Restore access and send a new instruction. Session identifiers stay private server data.

## What wins over a steer {#priority}

Cancel, a forced sleep, deleting the agent, revoked access and an exhausted budget always win: when they take effect, queued instructions are rejected. A steer never wakes a sleeping agent (`409 AGENT_SLEEPING` while it is going to sleep). An instruction handed over just before a cancel can still be confirmed by the engine for about a second; the cancel still ends the run, and an instruction the model did not read is reported `uncertain` (`UNREAD`).

A new instruction needs the agent's prepaid admission to pass. Before handing queued instructions to the engine, the worker checks funding and the run's budget again; funding can still change after that check. An instruction that fails it stays `queued` until the resulting sleep or the end of the run rejects it (`RUN_CANCELING` or `RUN_ENDED`).

## REST API {#rest-api}

Routes under `/api/workspaces/{slug}/agents/{agent_id}/runs/{run_id}`. The contract is the [OpenAPI spec](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml) (operations `steerAgentRun` and `listAgentRunSteers`).

| Route | Scope | Purpose |
|-------|-------|---------|
| `POST /steer` | `agents:control` | Send an instruction: body `{"message": "..."}` (1 to 8192 bytes of text) and a required `Idempotency-Key` header. Answers `202` with the request (`id`, `seq`, `status`, ...). |
| `GET /steers` | `agents:read` | List the run's instructions in order with their status and code. |

Any workspace member may steer; an API key or connected app also needs the scope. The message is never returned by the API and never written to events, logs or the audit log.

Retrying with the same `Idempotency-Key` returns the same request; reusing it with a different message is a `409`.

| Answer | When |
|--------|------|
| `400` | The message is empty, longer than 8192 bytes or not valid text, or the `Idempotency-Key` is missing or not 8 to 128 characters. |
| `404` | The agent or run is not in this workspace. |
| `409 NOT_SUPPORTED` | The engine, or the engine process serving this run, does not steer. |
| `409 STEER_NOT_READY` | The engine serving this run has not yet confirmed it can steer. Retry shortly. |
| `409 RUN_NOT_ACTIVE` | The run has not started, already ended, or the agent is being deleted. |
| `409 RUN_CANCELING` | A cancel is under way. |
| `409 AGENT_SLEEPING` | The agent is going to sleep. |
| `409 REVISION_CHANGED` | The agent was updated after the run started. |
| `429 STEER_QUEUE_FULL` | 8 instructions are already pending for this run, or it reached 50 in total. |
| `402 budget_exhausted` | The wallet or an agent budget is exhausted. Other admission refusals, such as billing that cannot be checked, answer `503`. |

```bash
BASE=https://api-v2.tose.sh/api/workspaces/my-team/agents/AGENT_ID/runs/RUN_ID

curl -sS -X POST "$BASE/steer" \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Idempotency-Key: steer-0001" \
  -H "Content-Type: application/json" \
  -d '{"message":"Keep the current database, only change the API and run the tests."}'

curl -sS "$BASE/steers" -H "X-API-Key: $TOSE_API_KEY"
```

The run's events carry `steer_queued`, `steer_delivered`, `steer_rejected` and `steer_uncertain` with `steer_id`, `seq`, status and code, never the message.

## MCP tool {#mcp-tool}

Instances that run the Agent Runtime offer `steer_agent_run` (scope `agents:control`) with `agent_id`, `run_id`, `message` and an optional `request_id` (8 to 64 characters; reuse it to retry safely). It applies the same rules. The steer refusal codes (such as `RUN_NOT_ACTIVE`, `STEER_NOT_READY`, `STEER_QUEUE_FULL` and `NOT_SUPPORTED`) are the same, while budget, billing, conflict, validation and not-found errors use the MCP codes `BUDGET_EXHAUSTED`, `BILLING_UNAVAILABLE`, `CONFLICT`, `INVALID_ARGUMENT` and `NOT_FOUND`. Without `request_id` a new one is generated, so a retry without it is a new instruction. The tool returns `status`, `steer_id` and `seq`. Follow the outcome in the run's events with `get_agent_run`.

## Dashboard {#dashboard}

The run page (`/w/<workspace>/agents/<agent_id>/runs/<run_id>`) has a **Steer the running run** form when the engine can steer and the run is running, with the notice that the instruction is added after the current tool turn and does not cancel a running tool. Below it, each instruction is listed with its status and code. The page is in English and Vietnamese.

## Related

- [`tose agents steer`](/commands/agents), to steer from the command line
- [Agent Runtime pricing and budgets](/guide/agent-runtime-pricing)
- [Environment variables of Agent Runtime agents](/guide/agent-environment-and-auto-sleep#agent-runtime-environment)
- [API keys and scopes](/api/api-keys)
