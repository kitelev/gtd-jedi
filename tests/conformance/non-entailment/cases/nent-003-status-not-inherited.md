---
test_type: non-entailment
test_id: NENT-003
description: "ems__Effort_status MUST NOT be inherited from prototype to instance"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to a prototype.
The prototype has `ems__Effort_status: ems__EffortStatusDoing`.
The instance has its own status (or no status = Backlog).

Rationale: Workflow status is per-instance. A prototype being "Doing" does not mean all instances are "Doing".

## Expected
```sparql
ASK { ?instance ems:Effort_status ?prototypeStatus }
```
## Result: false
