---
test_type: entailment
test_id: ENT-006
description: "Instance inheriting from gtd:InboxProcessingPrototype gets ems__Effort_duration = 20"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__InboxProcessingPrototype` (130f09ec-bea9-4014-94e3-5e45f39dce22).
The Inbox Processing Prototype defines `ems__Effort_duration: 20`.
Duration is an inheritable property.

## Expected
```sparql
ASK {
  ?instance exo:Asset_prototype gtd:InboxProcessingPrototype .
  gtd:InboxProcessingPrototype ems:Effort_duration 20 .
}
```
## Result: true
