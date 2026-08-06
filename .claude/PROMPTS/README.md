# .claude/PROMPTS — the spec library

**A spec in here IS the session prompt.** Paste the bootstrap block at the end of a spec into a fresh session; don't re-explain it.

## Which to use

| Situation | What to do |
|---|---|
| A spec already exists here | Use its **§13 bootstrap prompt**. Nothing else needed. |
| New multi-file feature | Write the spec here **first**, get it approved, then implement. |
| Bug fix / 1–2 file edit | No spec. Just do it, with the normal gate. |

## Rules every spec here follows

1. **Captured, not composed.** Contracts are captured from a live backend and pasted verbatim — never copied from API docs or memory. A doc has already been wrong on this project; the server has not.
2. **Pin the backend SHA.** First instruction is to check it. If the BE moved, STOP and re-capture.
3. **Negatives too.** Error cases are captured alongside happy paths, or the implementer invents error handling.
4. **dev vs production.** Any field that disappears in production is called out. Some fields here are dev-only.
5. **SCOPE and DO NOT TOUCH** are explicit file lists. Never "everything else".
6. **Cross-file contracts** — what must move together in one session, including **both** locale files.
7. **Decisions carry their reasons**, so a later session doesn't helpfully reverse them.
8. **Validation is a list of real runs**, not "it compiles". Never mark done without proof.
9. **Constrain the contract, scope and proof — not the approach.** Say what must be true and what may not be touched; don't dictate how to write the widget.

## The gate — every spec, no exceptions

`type-check` / `flutter analyze` → `/code-review` → `/security-review` → `/check-scope` → live smoke.

## Naming

`feat-…` · `fix-…` · `refactor-…`, suffixed `-web` or `-mobile` when the same contract lands in both repos.
