# GTD + Jedi Techniques — Ontology Plugin for Exocortex

Getting Things Done workflow with Maxim Dorofeev's Jedi Techniques adaptation.

## Quick Start

```bash
exocortex-cli assetspace add @kitelev/gtd-jedi@^0.1
```

Then open Command Palette in Obsidian and run **GTD: Quick Start**.

## For experienced users

Add one line to your root task prototype:

```markdown
exo__Asset_prototype: "[[gtd-jedi:task-prototype]]"
```

All your task instances will inherit GTD buttons, commands, and visibility rules.

## What's included

- **Workflow classes:** InboxItem, NextAction, WaitingFor, SomedayMaybe, Reference
- **Energy/Context tags:** HighEnergy, LowEnergy, AtComputer, AtPhone, AtOffice
- **Jedi tags:** Proactive (green), Reactive (red)
- **Commands:** Quick Start, Process Inbox, Weekly Review, Daily Review, Quick Capture, Context Filter
- **Buttons:** Next Action, Delegate, Someday/Maybe, Defer, Complete Review
- **Dashboards:** GTD Main, Weekly Review

## Testing

```bash
npm install
npm run test                        # all tests
npm run test:conformance            # all conformance tests
npm run test:conformance:structural # structural validators only
```

### Structural Conformance

Validates 4 invariants across all plugin `.md` files:

- **wikilinks** — all `[[uuid|...]]` references resolve to existing files
- **prototypeCycles** — no circular `exo__Asset_prototype` chains (DFS)
- **classLabels** — every `exo__Class` has `exo__Asset_label`
- **commandGrounding** — every `exocmd__Command` has `## Grounding` section

## Philosophy

Based on David Allen's GTD and Maxim Dorofeev's Jedi Techniques:
- Red tasks = reactive (external events). Green tasks = proactive (your goals)
- Energy-based filtering: do high-energy tasks when fresh, low-energy when tired
- Context filtering: @Computer, @Phone, @Office — see only actionable items
- Weekly Review: the cornerstone habit that keeps the system trusted
