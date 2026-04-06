---
test_type: entailment
test_id: ENT-005
description: "Prototype chain is transitive: WeeklyReviewPrototype → TaskPrototype → ems__TaskPrototype"
status: proposed
---
## Premises
`gtd__WeeklyReviewPrototype` has `exo__Asset_prototype` pointing to `gtd__TaskPrototype` (cb6165c5-9546-4706-b541-1867ffae6959).
`gtd__TaskPrototype` has `exo__Asset_prototype` pointing to `ems__TaskPrototype` (df7e579d).
The chain is: WeeklyReview → Task → ems__TaskPrototype.
An instance of WeeklyReview should see properties from all levels.

## Expected
```sparql
ASK {
  gtd:WeeklyReviewPrototype exo:Asset_prototype gtd:TaskPrototype .
  gtd:TaskPrototype exo:Asset_prototype ems:TaskPrototype .
}
```
## Result: true
