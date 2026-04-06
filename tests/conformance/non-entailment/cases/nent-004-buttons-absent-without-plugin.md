---
test_type: non-entailment
test_id: NENT-004
description: "GTD buttons are absent when gtd-jedi plugin namespace is not loaded"
status: proposed
---
## Premises
An instance loaded WITHOUT the gtd-jedi plugin namespace.
No plugin files are present in the resolution scope.
The instance exists in isolation (e.g., in a bare Exocortex install).

Rationale: Plugin-defined buttons only exist when the plugin is loaded. Without the plugin, no GTD buttons should appear.

## Expected
```sparql
ASK { ?instance gtd:hasButton ?button }
```
## Result: false
