---
test_type: entailment
test_id: ENT-002
description: "Instance inheriting from gtd:WeeklyReviewPrototype gets ems__Effort_duration = 60"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__WeeklyReviewPrototype` (52f7977a-7686-423b-81ea-c4c15868515d).
The Weekly Review Prototype defines `ems__Effort_duration: 60`.
Duration is an inheritable property.

## Expected
```sparql
ASK {
  ?instance exo:Asset_prototype gtd:WeeklyReviewPrototype .
  gtd:WeeklyReviewPrototype ems:Effort_duration 60 .
}
```
## Result: true
