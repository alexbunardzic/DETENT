# Architectural Brief — Detent

**A differential oracle that defends a trust boundary across time — over the entire specification surface.**

**Prepared for:** implementing architecture agency
**Prepared by:** Alex Bunardzic
**Document type:** architectural brief (intent + boundaries). The agency owns detailed design.
**Status:** for implementation scoping.

---

## 1. What this document is, and is not

This is an **architectural brief**, not an implementation spec. It fixes the *intent*, the *boundaries*, and a small set of *non-negotiable decisions*. Within those, the agency is expected to exercise its own design judgment.

The rationale behind these decisions will be briefed verbally; this document states the decisions, not the arguments for them. Where a decision is marked **[FIXED]** it is a constraint to honor. Where marked **[RECOMMENDED]** the agency may propose a counter with justification.

---

## 2. The product in one sentence

Detent compares a **trusted baseline** of a system's **specification artifacts** against a **proposed candidate** and emits a verdict on whether the encoded guarantees have been **strengthened, preserved, or silently weakened** — and whether protected meta-information has been **altered without authorization** — blocking the change when guarantees erode or protected knowledge is touched without sign-off.

It is the mechanism that catches an AI coding agent (or any actor) quietly relaxing a test, deleting an assertion, **or editing the meta-information that governs how the system is generated** — in order to make new work pass or proceed unimpeded.

---

## 3. Scope of "specification artifact" **[FIXED]**

Detent does **not** guard tests alone. It guards the full **specification surface**: the body of meta-information that governs how the system is generated, reversed, and re-generated. Drift in any of it is the same disease wearing different clothes.

Artifacts fall into three **classification-power tiers**. The tier determines what kind of verdict Detent can issue — not whether the artifact is guarded. All three are guarded.

| Tier | Artifact kinds (examples) | Classification power | Verdict behavior |
|---|---|---|---|
| **Executable** | Test suites (assertions, matchers, input domains) | **Full lattice** — strength is machine-decidable | `Strengthened / Preserved / Weakened / Removed / Added`, decided automatically |
| **Structured** | Declared constraints, config, deny-rules, thresholds, front-matter | **Partial** — some changes decidably weaken (rule removed, threshold loosened); others not | Lattice where semantics permit; `Incomparable` otherwise |
| **Prose meta-information** | `CLAUDE.md` and other `*.md` prompt/spec/directive files | **None** — "weaker" is not machine-decidable for free text | **Govern-only** (see §4). Any unauthorized change is blocking drift. |

All three tiers run through the *same oracle*, not separate systems. **The first release targets the prose tier**, then the structured tier, then the executable tier (see §10). Free tools already block agents from deleting or loosening tests at the `PreToolUse` hook; none of them protects specification files or config, records owner-approved exceptions, or measures mutation score.

---

## 4. The core mental model **[FIXED]**

Four framing commitments are non-negotiable because the entire design depends on them. The agency must not erode them during detailed design.

1. **This is a differential oracle, not a snapshot checker.** The fundamental operation is a binary function over two states: `(trustedBaseline, candidate) → Verdict`. The baseline is a **first-class input**, a peer of the candidate — never an implementation detail. Any design that evaluates only the current working tree has misunderstood the product.

2. **The verdict is a partial order, not a boolean.** A guarantee may be `Strengthened`, `Preserved`, `Weakened`, `Removed`, `Incomparable`, or `Added`. Only `Weakened` and `Removed` are drift-positive for executable artifacts. Modeling the verdict as pass/fail is a design failure.

3. **For non-executable meta-information, governance replaces grading.** Where severity cannot be machine-decided (prose, and the undecidable portion of structured artifacts), Detent does **not** attempt to prove "weaker." It enforces a **seal**: any change to protected meta-information that is not covered by an authorized, owner-approved exception is **blocking drift**, full stop. Unauthorized trespassing on protected meta-information is always a show-stopper. There is no advisory/severity classification of prose in scope — change-without-authorization *is* the drift.

4. **The tool is a referee, not a player.** It detects, reports, and blocks with enough precision for a human or an agent to act on. It does **not** auto-repair, rewrite code or prose, or feed fixes back into an agent loop. Refereeing is the entire scope.

The product metaphor that holds these together: Detent is a **ratchet on the guarantee-set and the specification surface** — guarantees may tighten freely; protected meta-information may change only through explicit, visible authorization. Neither may loosen or be silently altered.

---

## 5. Architectural style **[FIXED]**

- **Hexagonal (Ports & Adapters).** The justification is concrete: every external dependency is a side-effect source (git, filesystem, test runner, mutation engine, clock) that must be faked to keep the domain synchronously and exhaustively testable. The domain core must remain pure and import nothing from adapters or the runtime.
- **Test-Driven Development, strictly.** Every test — including architecture-boundary tests — is observed **failing before** the code that makes it pass is written. This is a process constraint on the engagement, not only on the artifact.
- **Restraint on ports.** Few ports, well-chosen. Do not proliferate ports beyond genuine side-effect boundaries. (Artifact *kinds* multiply behind a single extractor port — see §8 — not as new ports.)

---

## 6. Boundary discipline the architecture must enforce

The architecture itself must make these violations *structurally impossible or test-caught*:

- The **domain core** imports nothing from adapters, nor from any runtime/IO module.
- The **application layer** depends on **ports** (interfaces), never on concrete adapters.
- **Adapters** are interchangeable behind their ports; no adapter is referenced by the core.
- Architecture-boundary tests encoding the three rules above exist and are observed failing first.

How these are enforced (lint rules, import-boundary tests, conventions) is the agency's design choice. That they are enforced is **[FIXED]**.

---

## 7. Domain core — components and intent

The agency designs the types; the brief fixes the *responsibilities* and the *intent*. All components below are **pure** (no I/O).

| Component | Responsibility | Key intent constraint |
|---|---|---|
| **Guarantee** | Immutable description of one promise a specification artifact makes (identity + kind + strength descriptor). The **core type**; prose and structured claims are **variants under it**, distinguished by classification power. | Strength comparison obeys a **partial order**. Identity must be **stable across refactors** (rename/move) — see §13, top risk. Variants whose strength is undecidable carry a `governed` classification power rather than a strength descriptor. |
| **GuaranteeSurface** | The identity-keyed set of guarantees extracted from one snapshot of one or more artifacts. | Pure in-memory set. Extraction is a port, not this component. Heterogeneous: may hold executable, structured, and prose-variant guarantees together. |
| **classify** ★ | The differential brain: `(baseline, candidate) → Verdict` per guarantee, aggregated to a top-level verdict. **Classification-power-aware**: full lattice for executable guarantees; for `governed` (prose / undecidable) guarantees it emits `Preserved` when byte-identical and `ChangedUnderGovernance` when not. | Total over all pairings; order-independent; idempotent. `ChangedUnderGovernance` is drift-positive unless cleared by §7 RatchetPolicy. The highest-value unit; expect the largest test investment here. |
| **RatchetPolicy** | Applies authorized exceptions: drift (executable `Weakened`/`Removed`, or `ChangedUnderGovernance`) covered by a valid, versioned, owner-approved exception is downgraded; uncovered drift stays blocking. | Exceptions may only **downgrade**, never upgrade. Unmatched/expired exceptions are inert. No exceptions ⇒ identity. This is the **sole** mechanism by which protected meta-information may change. |
| **VerdictReport** | Pure formatter: verdict → human- and agent-readable explanation with the offending diff locus per drift item. | Every blocking item is locatable and self-explaining. No blocking item silently dropped. For governed artifacts, names the protected file and the unauthorized change. |

★ `classify` is the component most worth the agency's senior attention.

---

## 8. Ports — the boundaries to the messy world

These are the anticipated ports. The agency may refine signatures; the **set** should not grow without cause. Note that supporting a new *artifact kind* means a new **extractor adapter behind the existing extractor port**, not a new port.

| Port | Purpose | Adapter(s) (recommended) | Notes |
|---|---|---|---|
| **GuaranteeExtractorPort** | `artifactSource → GuaranteeSurface` | A **family of artifact extractors** behind one port: a **test extractor** (executable), a **prose/markdown extractor** (governed), and a **structured/config extractor** (partial). Each declares its classification power. | New artifact kinds = new adapters here, core untouched. |
| **ArtifactSourcePort** | `read(ref, paths) → artifactSources`, for both the trusted baseline and the candidate | git adapter (`git show` / worktree) | The **keystone I/O**. The *only* place git knowledge lives. A dirty working tree must never contaminate baseline retrieval. Retrieves **all** guarded artifacts, not just tests. |
| **ExceptionStorePort** | `loadExceptions()` | file adapter over a versioned, owner-governed exceptions file | **Fail closed**: malformed or missing store yields *no* exceptions, never "all allowed." Governs both executable weakening and meta-information change. **[FIXED]** An exception authorizes one exact change: it names the identity, the baseline seal and the candidate seal. Any further edit to the same artifact needs a new exception. The exceptions file is protected by CODEOWNERS review, not by the seal: sealing it would require an exception for every edit that adds an exception. It is read at the candidate ref, where a pull request adds an exception for review. |
| **ProtectedSetPort** | `loadProtectedPaths()` — which paths are under guard | file adapter over a versioned manifest | Declares the specification surface: which `*.md`, config, and test paths are protected. The manifest does not yet declare a classification tier per path; that arrives with the structured tier (step 12). Fail-closed posture: an unreadable manifest must not silently un-protect anything. The manifest is read at the baseline ref, so a candidate cannot unprotect a file by editing the manifest in the same change. |
| **MutationGatePort** | mutation-score regression check (executable tier only) | StrykerJS adapter | **CI-tier only**, never in the commit path (latency). Surfaces results in the same verdict vocabulary so it composes with `classify`. |

---

## 9. Triggers and execution tiers **[FIXED tiering]**

The same oracle is invoked by multiple triggers at two latency budgets. Trigger adapters are **thin wiring only** — no logic.

- **Local tier (fast, < ~1–2s budget):** pre-commit hook and PreToolUse hook, plus a CLI. Runs the differential checks (extract, classify, ratchet, report) across **all guarded artifacts** — including the prose-governance seal, which is cheap (a byte/structural comparison against baseline).
- **CI tier (async, latency-tolerant):** a GitHub Action running the same differential checks on every pull request, plus the mutation gate (StrykerJS) for the executable tier. The mutation gate **must not** run in the local/commit path.

The prose-governance seal runs in **both tiers**. Locally it catches the `CLAUDE.md`-edit case *before commit*. But agents can bypass local hooks (`--no-verify`, `git stash`, edited hook config), so the **CI check is the point of enforcement** and is built ahead of the local hooks (§10). CODEOWNERS review of the exceptions file is what makes an exception owner-approved.

---

## 10. TDD build order **[RECOMMENDED sequence]**

Ordered so each step's first failing test can be written using only already-built components or fakes — which is what makes "observe red first" honest rather than retrofitted. The agency may adjust but should preserve that property.

Steps 1–9 are complete, and step 11 is complete for the CLI. `classify` currently compares seals only; strength descriptors and the `Strengthened`/`Weakened` lattice arrive with the structured tier in step 12.

1. **Architecture-boundary tests first**, observed failing (§6). *Done.*
2. **Guarantee → GuaranteeSurface** (pure; no fakes needed) — including the `governed` variant and classification-power field from the start. *Done.*
3. **classify** ★ — seal comparison: `Preserved`, `ChangedUnderGovernance`, `Removed`, `Incomparable`, `Added`. *Done.*
4. **RatchetPolicy** — authorized-exception logic (pure). *Done.*
5. **VerdictReport** — report content for governed and executable drift. *Done.*
6. **Application service against all-fake ports** — proves the hexagon. *Done.*

**Phase A — protect specification files (release 0.1)**

7. **ArtifactSourcePort adapter (git)** — the keystone I/O, against a fixture repo, with a contract suite shared with the fake. *Done.*
8. **Prose/markdown extractor** — identity is the path; seal is a hash of normalized content. *Done.*
9. **ProtectedSetPort + ExceptionStorePort adapters (file)** — fail-closed tests first. Exceptions bind to one exact change (§8). *Done*, with ref-backed variants that read the manifest at the baseline and the exceptions file at the candidate.
10. **Rename handling in classify** — same seal at a new path is `Moved`, not `Removed` + `Added` (§13 risk 2). A domain change, so driven by failing tests first.
11. **Trigger adapters** — CLI, then GitHub Action, then pre-commit, then PreToolUse; smoke tests. *CLI done*; the rest are planned.

**Phase B — config and thresholds (release 0.2)**

12. **Strength descriptors for structured guarantees** — numeric thresholds with a direction, and rule sets. `Strengthened`/`Weakened` where decidable, `Incomparable` otherwise. The first real lattice work, and simpler to decide than tests.
13. **Structured/config extractor** — `.claude/settings.json` deny rules, Jest `coverageThreshold`, `tsconfig` strict flags, ESLint rule levels.

**Phase C — tests (release 0.3)**

14. **MutationGatePort adapter (Stryker)** — CI-tier only, scoped to test files changed in the pull request.
15. **Test extractor with lattice grading** (AST-based; golden-file driven) — recognizes strengthening and keeps identity stable across rename and move (§13 risk 1). **Deferred**, open for later. Free tools already cover syntax-level detection of weakened tests at the PreToolUse hook; this step is worth building only for what they do not do.

Steps 1–6 yield a fully tested differential oracle with **zero real I/O**. Steps 7–11 make it real and constitute the first release (§12). Steps 12–14 follow as separate releases.

**Fake fidelity is a first-class concern.** Every port has both a fake (used in steps 1–6) and a real adapter (steps 7–11). To prevent the fake and the real adapter silently diverging, define a **shared contract-test suite per port** and run it against *both* the fake and the real adapter, proving them interchangeable. Specify these contract suites as deliverables, not afterthoughts.

---

## 11. Recommended stack **[RECOMMENDED — open to counter]**

- **Language:** TypeScript. (Users' agent-heavy codebases are predominantly TS; the analyzer should live where the artifacts live.)
- **Test runner:** **Jest.** This is the deliberate choice, not a default — your existing assets (StrykerJS setup, PoC fixtures) are Jest-based, and, critically, the **test extractor must be tuned to the framework your users actually run, which is overwhelmingly Jest**. Building and dogfooding against Jest keeps the extractor on-target. The agency may counter with Vitest only with a concrete justification that outweighs extractor-fidelity and existing-asset reuse.
- **Mutation engine:** StrykerJS — **swappable** behind `MutationGatePort`.
- **Markdown/prose handling:** a standard Markdown parser for structural diffing of governed artifacts (the seal itself only needs authorized-change detection, so a byte/structural comparison suffices; no semantic NLP in scope).
- **Distribution:** Node CLI via npm, plus installable git hooks and a CI action.

The **hexagonal + TDD** constraints (§5) and the **core mental model** (§4) are not open to challenge.

---

## 12. Definition of done (release 0.1)

A Node CLI, a GitHub Action, and pre-commit/PreToolUse hooks that, against a real repository, detect and block — each with a self-explaining, located verdict and a fail-closed authorized-exception path:

- **any unauthorized change to a protected `*.md` / specification artifact** (e.g. `CLAUDE.md`), blocked as a show-stopper unless covered by a versioned, owner-approved exception for that exact change;
- the same for changes to the protected manifest and the exceptions file themselves;
- a protected file moved or renamed with unchanged content, reported as `Moved`, not as a breach.

The structured tier (release 0.2) and the mutation gate (release 0.3) follow. The test extractor and the architecture-invariant differentials (the parked ACL work) are deferred.

---

## 13. Risks the agency must design against

Stated as constraints on the design, in priority order:

1. **Guarantee identity stability.** If identity is name-based, refactors (rename/move) read as removal and produce false drift. Invest in **structural identity resolution** early. Top technical risk.
2. **Protected-set definition and the rename problem for prose.** Moving or renaming a protected `*.md` file must be distinguishable from deleting/altering it; otherwise legitimate reorganization reads as a seal breach. The `ProtectedSetPort` manifest and identity resolution must account for governed-artifact moves.
3. **`Incomparable` rate (executable tier).** If too many real changes classify as `Incomparable`, the tool is noisy. In v1 treat `Incomparable` as **warn, not block**, and instrument its rate before trusting it. (Note: this leniency applies only to the executable lattice — it does **not** apply to governed meta-information, where unauthorized change is always blocking by §4.3.)
4. **Local-tier latency.** Exceeding ~1–2s in the commit path kills adoption. Keep the domain pure/fast; scope extraction to changed artifacts only; never let mutation near the commit path. (The prose seal is trivial and safe here.)
5. **False positives in general.** A single spurious block trains users to bypass the tool. Optimize for precision and self-explaining verdicts. A false negative loses one bug; a false positive loses the user. The governance tier mitigates its own false-positive risk via the authorized-exception path — make that path low-friction for owners.
6. **Fake/real adapter fidelity drift.** Mitigated by the per-port contract suites (§10). Without them, green tests against fakes can mask broken real adapters.

---

## 14. Out of scope (this engagement)

- Auto-repair / agent-fix loops (referee-not-player).
- **Semantic/NLP grading of prose meta-information** — Detent governs prose by *authorized-change detection*, never by judging whether a wording change is "weaker." No advisory severity classifier for prose in scope.
- The ACL constraint language as a product, its compiler, and generated tests.
- The radar/scoring visualization.
- Multi-language adapters beyond the TS target.

---

## 15. Note on service virtualization (anticipated agency question)

Service virtualization tools (e.g. Mountebank, WireMock) are **not** appropriate here and are out of scope. They virtualize dependencies across a **network protocol**; Detent has no networked dependency — git, filesystem, test runner, mutation engine, and clock are all **local side-effects** behind ports. In-process fakes plus the per-port contract suites (§10) are the correct, lighter approach. Service virtualization would only become relevant if a future hosted component introduced a genuine remote API, and even then scoped to that one boundary in integration tests.
