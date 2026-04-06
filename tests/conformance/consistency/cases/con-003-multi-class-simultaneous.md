---
test_type: consistency
test_id: CON-003
description: "Instance with multiple workflow-classes (NextAction + HighEnergy + AtComputer) is consistent"
status: proposed
---
## Premises
An instance carries three workflow-classes simultaneously:
1. `gtd__NextAction` — workflow state (actionable)
2. `gtd__HighEnergy` — energy level classification
3. `gtd__AtComputer` — context classification

These classes are orthogonal dimensions (state, energy, context) and must coexist.
Open-world assumption: multiple `rdf:type` / `exo__Instance_class` values are valid.

## Expected
```sparql
ASK {
  ?instance rdf:type gtd:NextAction .
  ?instance rdf:type gtd:HighEnergy .
  ?instance rdf:type gtd:AtComputer .
}
```
## Result: true
