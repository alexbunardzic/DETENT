# Detent

**A differential oracle that defends a trust boundary across time — over the entire specification surface.**

Detent compares a sealed baseline of your specification artifacts against a proposed candidate and emits a verdict on whether the encoded guarantees were **strengthened, preserved, or silently weakened** — and whether protected meta-information was **altered without authorization**. It blocks the change when guarantees erode or protected knowledge is touched without sign-off.

> **Status: in development.** The domain core is a walking skeleton and the architecture-boundary tests are enforced. `classify`, the differential brain, is next. See [Status](#status) before opening issues.

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

Tests are the first-class, deepest-supported artifact and the MVP target. Meta-information is the generalization axis, proven out immediately after the executable wedge using the *same* oracle — not a second system.

---

## How it will run

Two latency tiers, one oracle. Trigger adapters are thin wiring with no logic of their own.

- **Local tier** (fast, ~1–2s budget) — pre-commit hook, `PreToolUse` hook, and a CLI. Runs extract → classify → ratchet → report across all guarded artifacts, including the prose seal, which is a cheap structural comparison against the baseline. This is the wedge.
- **CI tier** (async, latency-tolerant) — mutation-score regression via StrykerJS as a backstop for the executable tier. Never in the commit path.

---

## Status

Built strictly test-first: every test, including the architecture-boundary tests, is observed failing before the code that satisfies it. The sequence below is deliberate — each step's first failing test can be written using only already-built components or fakes, which is what makes "observe red first" honest rather than retrofitted.

| # | Step | State |
|---|---|---|
| 1 | Architecture-boundary tests (domain core imports no adapters, no Node IO) | **Done** |
| 2 | `Guarantee` → `GuaranteeSurface`, with classification power | **Walking skeleton** — identity and tier tags in place; strength descriptors pending |
| 3 | `classify` — the differential brain, largest test investment | **Next** |
| 4 | `RatchetPolicy` — authorized-exception logic over both drift kinds | Planned |
| 5 | `VerdictReport` — located, self-explaining verdicts | Planned |
| 6 | Application service against all-fake ports | Planned |
| 7 | `BaselineSourcePort` git adapter — the keystone I/O | Planned |
| 8 | Extractor adapters — test, then prose, then structured | Planned |
| 9 | `ProtectedSetPort` + `ExceptionStorePort`, fail-closed | Planned |
| 10 | Trigger adapters — pre-commit, `PreToolUse`, CLI | Planned |
| 11 | `MutationGatePort` (Stryker), CI tier only | Planned |

Steps 1–6 yield a fully tested differential oracle with **zero real I/O**, demonstrable on in-memory fixtures. Steps 7–10 make it real locally, and constitute the wedge MVP. Step 11 adds the CI backstop.

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
