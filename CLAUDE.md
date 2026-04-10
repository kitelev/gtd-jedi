# GTD Jedi — Ontology Plugin for Exocortex

## Что это

Публичный ontology plugin для Exocortex. Реализует Getting Things Done workflow с адаптацией "Джедайских техник" Максима Дорофеева. Содержит workflow classes, energy/context теги, команды, кнопки, дашборды, прототипы.

**Это НЕ приложение.** Это набор онтологических ассетов (`.md` файлы с YAML frontmatter и UUID именами).

## Структура

```
buttons/           — интерактивные кнопки (exocmd__Button ассеты)
workflow-classes/  — классы workflow (InboxItem, NextAction, WaitingFor и др.)
commands/          — команды (exocmd__Command ассеты)
prototypes/        — прототипы задач (ems__TaskPrototype)
dashboards/        — дашборды (exocmd__Dashboard)
ontology/          — определения свойств
tests/             — conformance, BDD, integration, e2e, performance
```

## .md файлы = онтологические ассеты

Каждый `.md` файл — это ассет с frontmatter:
- `exo__Asset_uid` — UUID
- `exo__Instance_class` — класс ассета (wikilink)
- Другие properties из онтологии

**НЕ редактируй .md файлы как документацию.** Это данные.

## Тесты

```bash
npm test                              # Все тесты
npm run test:conformance:structural   # Быстрая проверка структуры
npm run test:conformance              # Все conformance тесты
npm run test:bdd                      # BDD сценарии
npm run test:e2e                      # E2E (требует Docker + Obsidian)
```

Стек: Vitest, Playwright, Docker.

## Зависимости

Зависит от 3 онтологий из `kitelev/exocortex-public-ontologies`: exo-core, ems, exocmd.
Использует `@kitelev/exocortex-cli` для валидации и тестов.

## Scope override

**Из родительских CLAUDE.md НЕ применяются:**
- Gate 0 Protocol (Developer/CLAUDE.md) — это кодовый проект, не задача с базой знаний
- Worktree rules (exocortex-development/CLAUDE.md) — gtd-jedi имеет собственный git repo и workflow
- Multi-instance coordination — не используется для этого проекта

**Применяются:** exocortex-cli scoped name, wikilinks validation, GitHub Issues через агента.
