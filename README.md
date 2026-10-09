# Detent

**A differential oracle that defends a trust boundary across time — over the entire specification surface.**

Detent compares a sealed baseline of your specification artifacts against a proposed candidate and emits a verdict on whether the encoded guarantees were **strengthened, preserved, or silently weakened** — and whether protected meta-information was **altered without authorization**. It blocks the change when guarantees erode or protected knowledge is touched without sign-off.

> **Status: in development.** The domain core and the application service run against fake ports, and the architecture-boundary tests are enforced. `classify` currently compares seals; strength grading is not built yet. The git adapter is next. See [Status](#status) before opening issues.

---

## Why this exists

An AI coding agent has one target, and that target is a passing run. Hand it a red test and a loose instruction, and it may get there by adjusting what the test expects rather than what the code does — quietly, inside the same commit, with a cheerful summary reporting that everything passes.

```diff
  test('rejects a withdrawal that would overdraw the account', () => {
-   expect(() => account.withdraw(500)).toThrow(InsufficientFunds)
+   expect(account.withdraw(500)).toBeDefined()
  })
```

The suite is green. The guarantee is gone. Nothing in your pipeline noticed, because every tool you own asks "do the tests pass" and none of them asks "are these still the tests you agreed to."

The same failure mode reaches past tests. An agent that edits `CLAUDE.md`, a spec document, or a directive file is editing the instructions that govern how the system gets generated in the first place. Drift in any of it is the same disease wearing different clothes.

Detent is the referee for that boundary.

---

## The mental model

Four commitments the design rests on.

**1. A differential oracle, not a snapshot checker.** The fundamental operation is a binary function over two states: `(trustedBaseline, candidate) → Verdict`. The baseline is a first-class input, a peer of the candidate. Anything that evaluates only the current working tree has misunderstood the product.

```
  trusted baseline ─┐
                    ├─→ classify ─→ Verdict ─→ RatchetPolicy ─→ VerdictReport ─→ block / allow
  candidate ────────┘                            (authorized
                                                  exceptions)
```

**2. The verdict is a partial order, not a boolean.** A guarantee may be `Strengthened`, `Preserved`, `Weakened`, `Removed`, `Incomparable`, or `Added`. Only `Weakened` and `Removed` are drift-positive for executable artifacts. Modeling the verdict as pass/fail is a design failure.

**3. For non-executable meta-information, governance replaces grading.** Nobody can machine-decide that one paragraph of prose is "weaker" than another, so Detent does not try. It enforces a seal: any change to protected meta-information not covered by an authorized, owner-approved exception is blocking drift, full stop. Change-without-authorization *is* the drift.

**4. A referee, not a player.** It detects, reports, and blocks with enough precision to act on. It does not auto-repair, rewrite code or prose, or feed fixes back into an agent loop — which would reintroduce the very drift it exists to catch.

The image holding these together is a **ratchet**: guarantees may tighten freely; protected meta-information may change only through explicit, visible authorization. Neither may loosen or be silently altered.

---

## What it guards

Detent does not guard tests alone. It guards the full **specification surface**. All three tiers are guarded; the tier determines what kind of verdict is possible, not whether the artifact is protected.

| Tier | Artifacts | Classification power | Verdict behavior |
|---|---|---|---|
| **Executable** | Test suites — assertions, matchers, input domains | Full lattice, machine-decidable | `Strengthened` / `Preserved` / `Weakened` / `Removed` / `Added`, decided automatically |
| **Structured** | Declared constraints, config, deny-rules, thresholds, front-matter | Partial — some changes decidably weaken | Lattice where semantics permit, `Incomparable` otherwise |
| **Prose** | `CLAUDE.md` and other `*.md` prompt / spec / directive files | None | Govern-only. Any unauthorized change is blocking drift |

All three tiers run through the *same* oracle — not separate systems. The first release targets the prose tier, then structured artifacts, then tests. See [Status](#status) for why.

---

## How it will run

Two latency tiers, one oracle. Trigger adapters are thin wiring with no logic of their own.

- **Local tier** (fast, ~1–2s budget) — pre-commit hook, `PreToolUse` hook, and a CLI. Runs extract → classify → ratchet → report across all guarded artifacts, including the prose seal, which is a cheap structural comparison against the baseline. Local hooks can be bypassed (`--no-verify`, edited hook config), so this tier gives early warning, not enforcement.
- **CI tier** (async, latency-tolerant) — a GitHub Action that runs the same check on every pull request, and is the point of enforcement. Mutation-score regression via StrykerJS also runs here, as the check for the executable tier. Never in the commit path.

---

## Status

Built strictly test-first: every test, including the architecture-boundary tests, is observed failing before the code that satisfies it. Each step's first failing test can be written using only already-built components or fakes, which is what makes "observe red first" honest rather than retrofitted.

The order puts the prose and structured tiers ahead of tests. Free tools already block agents from deleting or loosening tests in a `PreToolUse` hook ([test-guard](https://github.com/kwangtaeko/test-guard), [assertion-guardian](https://github.com/ccdwyer/assertion-guardian)). None of them protects specification files or config, records owner-approved exceptions, or measures mutation score. Detent builds those first.

| # | Step | State |
|---|---|---|
| 1 | Architecture-boundary tests (domain core imports no adapters, no Node IO) | **Done** |
| 2 | `Guarantee` → `GuaranteeSurface`, with classification power | **Done** — identity, tier and seal; strength descriptors arrive in step 12 |
| 3 | `classify` — seal comparison: `Preserved`, `ChangedUnderGovernance`, `Removed`, `Incomparable`, `Added` | **Done** |
| 4 | `RatchetPolicy` — authorized-exception logic | **Done** |
| 5 | `VerdictReport` — located, self-explaining verdicts | **Done** |
| 6 | Application service against all-fake ports | **Done** |
| **A** | **Protect specification files — release 0.1** | |
| 7 | Git adapter for `ArtifactSourcePort`, with a contract suite run against the fake and the real adapter | **Next** |
| 8 | Prose extractor — identity is the path, seal is a hash of normalized content | Planned |
| 9 | `ProtectedSetPort` + `ExceptionStorePort` file adapters, fail-closed. An exception authorizes one exact change: identity + baseline seal + candidate seal. The exceptions file and the manifest are themselves protected | Planned |
| 10 | Rename handling in `classify` — same seal at a new path is `Moved`, not `Removed` + `Added` | Planned |
| 11 | Trigger adapters — CLI, GitHub Action, pre-commit, `PreToolUse` | Planned |
| **B** | **Config and thresholds — release 0.2** | |
| 12 | Strength descriptors for structured guarantees — numeric thresholds with a direction, and rule sets. `Strengthened` / `Weakened` where decidable, `Incomparable` otherwise | Planned |
| 13 | Structured extractor — `.claude/settings.json` deny rules, Jest `coverageThreshold`, `tsconfig` strict flags, ESLint rule levels | Planned |
| **C** | **Tests — release 0.3** | |
| 14 | `MutationGatePort` (Stryker), CI tier only, scoped to test files changed in the PR | Planned |
| 15 | Test extractor with lattice grading (AST, Jest) — recognizes strengthening, keeps identity stable across rename and move | **Deferred** — open for later |

Steps 1–6 yield a fully tested differential oracle with **zero real I/O**, demonstrable on in-memory fixtures. Steps 7–11 make it real and constitute the first release: no change to a protected specification file reaches main without a recorded, owner-approved exception for that exact change.

---

## Architecture

Hexagonal (ports and adapters), because every external dependency — git, filesystem, test runner, mutation engine, clock — is a side-effect source that must be faked to keep the domain synchronously and exhaustively testable.

```
src/domain/       pure core: Guarantee, GuaranteeSurface, classify,
                  RatchetPolicy, VerdictReport — imports nothing from
                  adapters or the runtime
tests/architecture/   boundary rules, enforced as tests
tests/domain/         the core's own suite
```

Boundary rules the architecture makes structurally impossible or test-caught:

- the domain core imports nothing from adapters, nor from any runtime/IO module
- the application layer depends on ports, never on concrete adapters
- adapters are interchangeable behind their ports; no adapter is referenced by the core

Every port gets both a fake and a real adapter, plus a **shared contract-test suite run against both** — so a green run against fakes cannot mask a broken adapter.

The full reasoning, the fixed decisions, and the risks the design has to survive are in **[detent-architectural-brief.md](./detent-architectural-brief.md)**. Read that before proposing design changes; it states what is settled and what is open to counter.

---

## Not in scope

Stated up front, because each of these is a reasonable thing to expect and none of them is coming:

- **Auto-repair or agent-fix loops.** Referee, not player.
- **Semantic grading of prose.** Detent governs prose by authorized-change detection, never by judging whether a wording change is weaker.
- A constraint language as a product, its compiler, or generated tests.
- Scoring and radar visualization. The idea returns later as analytics; the code does not.
- Multi-language adapters beyond the TypeScript target.
- Service virtualization. There is no networked dependency here — every side effect is local, behind a port, and faked in-process.

---

## Development

```bash
npm install
npm test
```

TypeScript, Jest, `ts-jest`. Jest is a deliberate choice rather than a default: the test extractor has to be tuned to the framework users actually run, and dogfooding against Jest keeps it on target.

---

## Background

The problem this addresses is described in [A green build is no longer evidence](https://alexbunardzic.com/agents-optimize-for-green.html), drawn from an AI Craftspeople Guild working session on why agents are asked for a failing test before they implement anything.

Built by [Alex Bunardzic](https://alexbunardzic.com). 2026
