---
test_type: entailment
test_id: ENT-003
description: "Instance inheriting from gtd:WeeklyReviewPrototype receives class gtd__Review via prototype chain"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__WeeklyReviewPrototype` (52f7977a-7686-423b-81ea-c4c15868515d).
The Weekly Review Prototype has `exo__Instance_class` including `gtd__Review`.
Classes are accumulated through the prototype chain.

## Expected
```sparql
ASK {
  ?instance exo:Asset_prototype gtd:WeeklyReviewPrototype .
  gtd:WeeklyReviewPrototype exo:Instance_class gtd:Review .
}
```
## Result: true
