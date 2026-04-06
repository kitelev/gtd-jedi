---
test_type: consistency
test_id: CON-002
description: "User override of inherited property (duration) creates no contradiction"
status: proposed
---
## Premises
An instance inherits `ems__Effort_duration: 60` from `gtd__WeeklyReviewPrototype`.
The user sets `ems__Effort_duration: 90` directly on the instance.

According to inheritance rules, the instance's own value takes precedence.
The result must be a single value (90), not two conflicting values.

## Expected
```sparql
ASK {
  ?instance ems:Effort_duration 90 .
  FILTER NOT EXISTS { ?instance ems:Effort_duration 60 }
}
```
## Result: true
