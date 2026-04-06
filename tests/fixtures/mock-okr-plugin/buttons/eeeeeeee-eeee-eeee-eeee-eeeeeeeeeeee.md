---
exo__Asset_isDefinedBy: "[[!mock-okr-plugin]]"
exo__Asset_uid: eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
exo__Instance_class:
  - "[[exo-ui__Button]]"
exo__Asset_label: "Update Progress"
aliases:
  - okr__ButtonUpdateProgress
exo-ui__Button_variant: "secondary"
exo-ui__Button_icon: "bar-chart"
exo-ui__Button_group: "OKR"
---
## Visibility
SPARQL ASK: asset has class okr__Objective

## Grounding
1. prompt: "Enter current progress percentage"
2. property_set: okr__Objective_progress → input.value
