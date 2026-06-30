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

**Tests are the first-class, deepest-supported artifact and the MVP target.** Meta-information is the architecture's generalization axis — proven out immediately after the executable wedge, using the *same oracle*, not a second system.

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
| **Guarantee** | Immutable description of one promise a specification artifact makes (identity + kind + strength descriptor). The **core type**; prose and structured claims are **variants under it**, distinguished by classification power. | Strength comparison obeys a **partial order**. Identity must be **stable across refactors** (rename/move) — see §11, top risk. Variants whose strength is undecidable carry a `governed` classification power rather than a strength descriptor. |
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
| **GuaranteeExtractorPort** | `artifactSource → GuaranteeSurface` | A **family of artifact extractors** behind one port: a **test extractor** (executable), a **prose/markdown extractor** (governed), and a **structured/config extractor** (partial). Each declares its classification power. | Highest-value salvage from the existing PoC: repurpose the AST scanner as the **test extractor**. New artifact kinds = new adapters here, core untouched. |
| **BaselineSourcePort** | `ref → artifactSources` for the trusted baseline | git adapter (`git show` / worktree) | The **keystone I/O**. The *only* place git knowledge lives. A dirty working tree must never contaminate baseline retrieval. Retrieves **all** guarded artifacts, not just tests. |
| **ExceptionStorePort** | `loadExceptions()` | file adapter over a versioned, owner-governed exceptions file | **Fail closed**: malformed or missing store yields *no* exceptions, never "all allowed." Governs both executable weakening and meta-information change. |
| **ProtectedSetPort** | `loadProtectedManifest()` — which artifacts/paths are under guard and at what tier | file adapter over a versioned manifest | Declares the specification surface: which `*.md`, config, and test paths are protected and their classification tier. Fail-closed posture: an unreadable manifest must not silently un-protect anything. |
| **MutationGatePort** | mutation-score regression check (executable tier only) | StrykerJS adapter | **CI-tier only**, never in the commit path (latency). Surfaces results in the same verdict vocabulary so it composes with `classify`. |

---

## 9. Triggers and execution tiers **[FIXED tiering]**

The same oracle is invoked by multiple triggers at two latency budgets. Trigger adapters are **thin wiring only** — no logic.

- **Local tier (fast, < ~1–2s budget):** pre-commit hook and PreToolUse hook, plus a CLI. Runs the differential checks (extract, classify, ratchet, report) across **all guarded artifacts** — including the prose-governance seal, which is cheap (a byte/structural comparison against baseline). **Build this tier first** — it is the wedge.
- **CI tier (async, latency-tolerant):** the mutation gate (StrykerJS) as a backstop for the executable tier. **Must not** run in the local/commit path.

The prose-governance seal belongs in the **local tier** — it is exactly the `CLAUDE.md`-edit case you most want caught *before commit*, and it is computationally trivial.

---

## 10. Salvage directives — existing PoC repos

Two repos exist (`executable-architecture`, `constraints-driven-software-development`). Treat them per the table. The agency should **not** adopt the existing pipeline wholesale.

| Existing asset | Directive | Intent |
|---|---|---|
| AST code-model scanner (TS) | **Salvage + reposition** | Highest-value reuse. Becomes the **test extractor** behind `GuaranteeExtractorPort`: from "scan for bad structure" to "extract the guarantee surface of a test file." |
| Versioned global/local rule split + CODEOWNERS governance | **Salvage the pattern** | Becomes the model for **authorized change**: loosening or meta-information edits allowed only via a versioned, owner-approved exception. Feeds `RatchetPolicy`, `ExceptionStorePort`, and `ProtectedSetPort`. |
| CI workflow (run on event, upload reports) | **Salvage as template** | Reuse the shape for the CI-tier mutation trigger. |
| `executable-architecture` single-script scanner | **Reference only** | Source of demo/fixture material, not a build base. |
| ACL parser + constraint grammar | **Park (deferred product)** | Belongs to a later architecture-invariant-differential phase. The **structured/config extractor** may borrow parsing ideas, but the ACL-as-product is out of scope. |
| Constraint compiler → generated tests | **Out of scope** | Codegen of tests is orthogonal to defending an existing surface. |
| Six-axis Radar | **Discard code; retain idea** | Scoring/visualization returns later as paid analytics ("ratchet engagement over time"). |
| Autopilot (repair tasks/prompts) | **Out of scope** | Auto-repair violates referee-not-player (§4.4). |

---

## 11. TDD build order **[RECOMMENDED sequence]**

Ordered so each step's first failing test can be written using only already-built components or fakes — which is what makes "observe red first" honest rather than retrofitted. The agency may adjust but should preserve that property.

1. **Architecture-boundary tests first**, observed failing (§6).
2. **Guarantee → GuaranteeSurface** (pure; no fakes needed) — including the `governed` variant and classification-power field from the start.
3. **classify** ★ — the core; largest test investment. Drive the executable lattice *and* the `governed` → `Preserved`/`ChangedUnderGovernance` behavior, and the partial-order laws.
4. **RatchetPolicy** — authorized-exception logic over both drift kinds (pure).
5. **VerdictReport** — report content for executable and governed drift.
6. **Application service against all-fake ports** — proves the hexagon: the use case goes green while every real adapter is still empty.
7. **BaselineSourcePort adapter (git)** — the keystone I/O, against a fixture repo.
8. **Extractor adapters** — **test extractor first** (salvage/adapt the AST scanner; golden-file driven), then **prose/markdown extractor** (the governance seal), then **structured/config extractor**.
9. **ProtectedSetPort + ExceptionStorePort adapters (file)** — fail-closed tests first.
10. **Trigger adapters** — pre-commit, then PreToolUse, then CLI; smoke tests.
11. **MutationGatePort adapter (Stryker)** — CI-tier, last, out of the commit path.

Steps 1–6 yield a fully tested differential oracle with **zero real I/O** — demonstrable on in-memory fixtures (including a prose-governance scenario) before any git/AST/Stryker work. Steps 7–10 make it real locally. Step 11 adds the CI backstop. Steps 1–10 constitute the wedge MVP.

**Fake fidelity is a first-class concern.** Every port has both a fake (used in steps 1–6) and a real adapter (steps 7–11). To prevent the fake and the real adapter silently diverging, define a **shared contract-test suite per port** and run it against *both* the fake and the real adapter, proving them interchangeable. Specify these contract suites as deliverables, not afterthoughts.

---

## 12. Recommended stack **[RECOMMENDED — open to counter]**

- **Language:** TypeScript. (Users' agent-heavy codebases are predominantly TS; the analyzer should live where the artifacts live.)
- **Test runner:** **Jest.** This is the deliberate choice, not a default — your existing assets (StrykerJS setup, PoC fixtures) are Jest-based, and, critically, the **test extractor must be tuned to the framework your users actually run, which is overwhelmingly Jest**. Building and dogfooding against Jest keeps the extractor on-target. The agency may counter with Vitest only with a concrete justification that outweighs extractor-fidelity and existing-asset reuse.
- **Mutation engine:** StrykerJS — **swappable** behind `MutationGatePort`.
- **Markdown/prose handling:** a standard Markdown parser for structural diffing of governed artifacts (the seal itself only needs authorized-change detection, so a byte/structural comparison suffices; no semantic NLP in scope).
- **Distribution:** Node CLI via npm, plus installable git hooks and a CI action.

The **hexagonal + TDD** constraints (§5) and the **core mental model** (§4) are not open to challenge.

---

## 13. Definition of done (wedge MVP)

A Node CLI plus pre-commit/PreToolUse hooks that, against a real repository, detect and block — each with a self-explaining, located verdict and a fail-closed authorized-exception path:

**Executable tier:**
- removed tests, weakened matchers, narrowed input domains, assertions that changed and now fail against the baseline.

**Meta-information (governance) tier:**
- **any unauthorized change to a protected `*.md` / specification artifact** (e.g. `CLAUDE.md`), blocked as a show-stopper unless covered by a versioned, owner-approved exception.

The CI-tier mutation backstop follows immediately after. The structured/config tier and architecture-invariant differentials (the parked ACL work) are explicitly later phases.

---

## 14. Risks the agency must design against

Stated as constraints on the design, in priority order:

1. **Guarantee identity stability.** If identity is name-based, refactors (rename/move) read as removal and produce false drift. Invest in **structural identity resolution** early. Top technical risk.
2. **Protected-set definition and the rename problem for prose.** Moving or renaming a protected `*.md` file must be distinguishable from deleting/altering it; otherwise legitimate reorganization reads as a seal breach. The `ProtectedSetPort` manifest and identity resolution must account for governed-artifact moves.
3. **`Incomparable` rate (executable tier).** If too many real changes classify as `Incomparable`, the tool is noisy. In v1 treat `Incomparable` as **warn, not block**, and instrument its rate before trusting it. (Note: this leniency applies only to the executable lattice — it does **not** apply to governed meta-information, where unauthorized change is always blocking by §4.3.)
4. **Local-tier latency.** Exceeding ~1–2s in the commit path kills adoption. Keep the domain pure/fast; scope extraction to changed artifacts only; never let mutation near the commit path. (The prose seal is trivial and safe here.)
5. **False positives in general.** A single spurious block trains users to bypass the tool. Optimize for precision and self-explaining verdicts. A false negative loses one bug; a false positive loses the user. The governance tier mitigates its own false-positive risk via the authorized-exception path — make that path low-friction for owners.
6. **Fake/real adapter fidelity drift.** Mitigated by the per-port contract suites (§11). Without them, green tests against fakes can mask broken real adapters.

---

## 15. Out of scope (this engagement)

- Auto-repair / agent-fix loops (referee-not-player).
- **Semantic/NLP grading of prose meta-information** — Detent governs prose by *authorized-change detection*, never by judging whether a wording change is "weaker." No advisory severity classifier for prose in scope.
- The ACL constraint language as a product, its compiler, and generated tests.
- The radar/scoring visualization.
- Multi-language adapters beyond the TS target.
- Hosted/SaaS analytics tier (a later phase the retained scoring idea will feed).

---

## 16. Note on service virtualization (anticipated agency question)

Service virtualization tools (e.g. Mountebank, WireMock) are **not** appropriate here and are out of scope. They virtualize dependencies across a **network protocol**; Detent has no networked dependency — git, filesystem, test runner, mutation engine, and clock are all **local side-effects** behind ports. In-process fakes plus the per-port contract suites (§11) are the correct, lighter approach. Service virtualization would only become relevant if a future hosted analytics tier introduced a genuine remote API, and even then scoped to that one boundary in integration tests.
