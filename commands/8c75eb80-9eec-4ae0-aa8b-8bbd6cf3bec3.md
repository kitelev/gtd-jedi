---
exo__Asset_isDefinedBy: "[[!gtd-jedi]]"
exo__Asset_uid: 8c75eb80-9eec-4ae0-aa8b-8bbd6cf3bec3
exo__Instance_class:
  - "[[exocmd__Command]]"
exo__Asset_label: "GTD: Process Inbox"
aliases:
  - gtd__ProcessInbox
exo__Asset_description: "Process all inbox items one by one. For each: decide next action, delegate, defer, or trash."
exocmd__Command_category: "GTD"
---
## Precondition
SPARQL ASK: exists at least 1 asset with class gtd__InboxItem

## Grounding
1. Query all assets with class gtd__InboxItem, ordered by createdAt
2. For each item, show modal with buttons:
   - "Next Action" → remove gtd__InboxItem, add gtd__NextAction, set ems__Effort_status → Doing
   - "Delegate" → remove gtd__InboxItem, add gtd__WaitingFor, prompt for delegatee
   - "Someday/Maybe" → remove gtd__InboxItem, add gtd__SomedayMaybe
   - "Reference" → remove gtd__InboxItem, add gtd__Reference, set ems__Effort_status → Done
   - "Trash" → set ems__Effort_status → Done
3. When inbox empty, show "Inbox Zero!" notification
