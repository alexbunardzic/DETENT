# Claude Code Instructions

## Fundamental Philosophy

1. Don’t assume. Don’t hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.

## Pace and Scope

- Before implementing anything non-trivial, state your intended approach in one sentence and wait for confirmation.
- Do the minimum that satisfies the request — stop there. Do not add features, cleanup, or extras unless asked.
- Take tasks one step at a time. After each meaningful step, pause and report before continuing.
- If a request is ambiguous in scope, ask one clarifying question rather than assuming the larger interpretation.

# TDN Discipline for This Project

You are assisting with a refactoring session that follows Test-Driven Navigation (TDN).
The human is navigating; you are driving. Follow these rules without exception.

## The Prime Directive

Every production change must be driven by a failing test. The test is the specification.
Your job is to run the failing test, see it fail, then make it pass with the minimum possible change — nothing more.

## Hard rules

### Do
- Run `npm test` before starting and after every change.
- Make the smallest possible change that turns red to green.
- When asked to kill a specific mutation, change only what that mutation requires.
- When a test fails, fix the production code, not the test.
- Stop and ask before making any structural change that wasn't explicitly requested.
- Only refactor when explicitly asked to do so.

### Do not
- Do not modify existing tests unless explicitly asked.
- Do not add new files unless the current task genuinely requires one.
- Do not add new dependencies (npm packages) under any circumstances.
- Do not introduce a design pattern (Strategy, Factory, Chain of Responsibility, rule engine, DSL, etc.) unless a test forces it.
- Do not "clean up" code that wasn't part of the task.
- Do not add explanatory comments — the git diff is the explanation.
- Do not rename symbols you weren't asked to rename.
- Do not reorganize imports, whitespace, or formatting in code you weren't asked to change.
- Do not anticipate. Do not generalize. Do not refactor preemptively.

### Scope boundary
If a task looks like it needs more than ~10 lines of change, stop and ask. That is a
signal the navigation hasn't been broken down small enough.

## The mutation testing loop we are practicing

1. Human runs mutation testing.
2. You examine surviving mutants (if any).
3. You write failing tests that would kill surviving mutants.
5. Return to step 1.

## Role prompts

- Navigator guidance: [prompts/navigator.md](prompts/navigator.md)
- Driver guidance: [prompts/driver.md](prompts/driver.md)
