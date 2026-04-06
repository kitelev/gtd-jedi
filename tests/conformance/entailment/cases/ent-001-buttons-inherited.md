---
test_type: entailment
test_id: ENT-001
description: "Instance with gtd:TaskPrototype inherits GTD button group membership"
status: proposed
---
## Premises
An instance with `exo__Asset_prototype` pointing to `gtd__TaskPrototype` (cb6165c5-9546-4706-b541-1867ffae6959).
The GTD Task Prototype defines inherited behavior including GTD buttons (Next Action, Delegate, Someday/Maybe, Defer, Complete Review).
All buttons in the plugin have `exo-ui__Button_group: "GTD"`.

## Expected
```sparql
ASK {
  ?instance exo:Asset_prototype gtd:TaskPrototype .
  ?button exo-ui:Button_group "GTD" .
  ?button exo:Asset_isDefinedBy gtd-jedi: .
}
```
## Result: true
