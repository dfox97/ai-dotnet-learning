# ReviewLab personal alpha evaluation

Use this after completing the published alpha as its first learner. The purpose is to decide what ReviewLab should do next, not to manufacture a success result.

## Evidence to retain

Keep these together as the alpha evidence pack:

- exported ReviewLab learning report (JSON and/or Markdown);
- the completed friction log in `docs/personal-alpha-friction-log.md`;
- the capstone workspace or commit showing the learner repair and local test result;
- this evaluation with the final decision section completed.

Do not edit the baseline result after studying answer material. Remediation attempts are separate evidence and the original post-diagnostic remains preserved by ReviewLab.

## Run order

1. Complete the baseline diagnostic before reading lesson answer material.
2. Follow the recommended pathway and complete the relevant review/practice work.
3. Complete the post-diagnostic.
4. If critical risks remain, follow the targeted remediation and complete a remediation attempt.
5. Generate the runnable capstone, record the review before revealing expert guidance, repair it locally, run the tests and record the evidence/reflection.
6. Export the final local learning report.
7. Complete the friction log and the decision below.

## Evaluation

Record the values from the final report rather than estimating them.

| Signal | Evidence | Interpretation |
| --- | --- | --- |
| Baseline score | _fill after run_ | Starting review evidence |
| Latest post/remediation score | _fill after run_ | End-of-alpha review evidence |
| Overall improvement | _fill after run_ | Direction and magnitude of change |
| Critical risks unresolved | _fill after run_ | Must be zero before claiming mastery |
| Capstone stage/outcome | _fill after run_ | Whether review knowledge transferred into repair/evidence |
| Capstone local test result | _fill after run_ | Executable evidence, not browser inference |
| High-severity usability friction | _fill after run_ | Whether workflow friction distorted the learning experience |
| Work relevance (1–5) | _fill after run_ | Personal judgement of relevance to production .NET/automation work |

### Questions

- Which competency changed most from baseline to the final mastery evidence, and what part of the learning flow appears to have caused it?
- Which competency, if any, remained weak despite remediation?
- Did the structured review prompts improve the quality of the reasoning you would actually put on a production PR?
- Did the capstone expose a gap between recognising a defect and implementing/verifying the repair?
- Which learning activity felt least connected to the work you expect to do?
- Which friction items caused confusion, interrupted flow, or encouraged gaming rather than learning?

## One-person alpha limitation

A personal alpha can test coherence, learning flow, technical reliability and perceived relevance for its owner. It cannot establish general learning effectiveness, usability across different backgrounds, market demand or product-market fit. Improvement from one learner can also be affected by repeated exposure, prior knowledge and motivation.

## Decision rule

Choose exactly one next branch. Do not silently expand the alpha scope.

### A — External learner validation

Choose this when the personal flow is coherent, critical risks can be cleared, the capstone feels work-relevant, and remaining friction is bounded. The next approved ticket set should define the previously planned 8–12 representative TypeScript/Node automation engineer cohort, mixing observed sessions with independent use.

### B — Further learning-fidelity work

Choose this when diagnostic scores improve but the capstone shows that recognition does not reliably transfer into repair/execution, or when activities are too easy to game. Follow-up tickets should be limited to the specific fidelity gaps observed.

### C — Bounded AI coach experiment

Choose this only when the workflow itself works but written review reasoning still needs feedback that the deterministic rubric cannot provide. Keep the experiment rubric-grounded, optional and separate from mastery scoring.

### D — Platform investment

Choose this only if the alpha demonstrates that accounts, sync, consented analytics or authoring workflow are required for the next approved validation step. Do not choose it for convenience alone.

## Final go/no-go record

- **Decision:** _A / B / C / D_
- **Why:** _fill after evidence review_
- **What evidence most influenced the decision:** _fill after evidence review_
- **What the alpha did not prove:** _fill explicitly_
- **Approved next ticket set:** _link newly approved issues only; do not add hidden scope to the personal-alpha roadmap_
