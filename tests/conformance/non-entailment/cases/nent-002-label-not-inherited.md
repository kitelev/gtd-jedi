---
test_type: non-entailment
test_id: NENT-002
description: "exo__Asset_label MUST NOT be inherited from prototype to instance"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__TaskPrototype` (cb6165c5-9546-4706-b541-1867ffae6959).
The prototype has `exo__Asset_label: "GTD Task Prototype"`.
The instance has its own label.

Rationale: Labels are user-chosen names. Inheriting the prototype's label would overwrite the user's chosen name.

## Expected
```sparql
ASK { ?instance exo:Asset_label "GTD Task Prototype" }
```
## Result: false
