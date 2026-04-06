---
test_type: non-entailment
test_id: NENT-001
description: "exo__Asset_uid MUST NOT be inherited from prototype to instance"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__TaskPrototype` (cb6165c5-9546-4706-b541-1867ffae6959).
The prototype has `exo__Asset_uid: cb6165c5-9546-4706-b541-1867ffae6959`.
The instance has its own uid.

Rationale: UIDs are globally unique identifiers. If inherited, two assets would share the same UID, corrupting the graph.

## Expected
```sparql
ASK { ?instance exo:Asset_uid "cb6165c5-9546-4706-b541-1867ffae6959" }
```
## Result: false
