---
test_type: consistency
test_id: CON-001
description: "gtd-jedi and mock-okr plugins coexist without button group conflicts"
status: proposed
---
## Premises
Two plugins loaded simultaneously:
1. gtd-jedi — defines buttons with `exo-ui__Button_group: "GTD"`
2. mock-okr-plugin — defines buttons with `exo-ui__Button_group: "OKR"`

Button groups use different namespaces ("GTD" vs "OKR"), so no collision occurs.
Both sets of buttons are independently visible to instances that qualify.

## Expected
```sparql
ASK {
  ?gtdButton exo-ui:Button_group "GTD" .
  ?okrButton exo-ui:Button_group "OKR" .
  FILTER (?gtdButton != ?okrButton)
}
```
## Result: true
