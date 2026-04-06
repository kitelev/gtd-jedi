---
test_type: entailment
test_id: ENT-004
description: "Instance inheriting from gtd:DailyReviewPrototype gets ems__Effort_duration = 15"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__DailyReviewPrototype` (096e9f41-12bf-462f-856d-13ec67419728).
The Daily Review Prototype defines `ems__Effort_duration: 15`.
Duration is an inheritable property.

## Expected
```sparql
ASK {
  ?instance exo:Asset_prototype gtd:DailyReviewPrototype .
  gtd:DailyReviewPrototype ems:Effort_duration 15 .
}
```
## Result: true
