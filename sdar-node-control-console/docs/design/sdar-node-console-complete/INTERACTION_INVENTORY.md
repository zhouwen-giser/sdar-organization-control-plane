# Interaction Inventory

## Query interactions

Lists provide search, status filtering, refresh, empty/error/loading handling and deep links. Detail pages provide refresh, domain not-found handling, relation navigation, contract DTO inspection and state interpretation.

## Command interactions

Commands are permission-aware and require a reason. Mutation flows expose submitting, accepted, running, succeeded, failed and revision-conflict states. Asynchronous commands create a Management Operation and append Audit/Event evidence.

## High-risk controls

Publishing, suspension, retirement/removal, task pause/cancel, rollback and telemetry publication display impact context and explicit confirmation fields. Secret material is accepted only as SecretRef metadata.

## Local validation scenarios

`healthy`, `degraded`, `empty`, `network-error`, `revision-conflict`, and `slow-network` are deterministic and reset on refresh.
