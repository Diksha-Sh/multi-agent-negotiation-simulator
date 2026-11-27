# Milestone 4 - Scoring and Testing Report

## 1. Responsibility

My Milestone 4 responsibility was the **Resolution Quality Scoring Engine** and **Manual Testing** of the negotiation scoring experience.

The scoring engine evaluates completed negotiations and produces an overall resolution quality score from 0 to 100, together with metric-level scores and a breakdown suitable for display in the post-interaction summary.

## 2. Implemented Scoring Metrics

The implemented scoring formula uses four metrics with the following weights:

| Metric | Weight | Description |
|---|---:|---|
| Surplus Efficiency | 30% | Measures how close the final settlement is to the midpoint of the feasible agreement region for the negotiated items. |
| Concession Reciprocity | 25% | Measures whether the agents made comparable concessions based on their counteroffer movements. |
| Pacing & Efficiency | 25% | Rewards agreements reached efficiently within the configured maximum number of rounds. |
| Boundary Safety | 20% | Rewards settlements that remain within the combined reservation limits and maintain an appropriate safety margin. |

The metric weights add up to 100:

`30 + 25 + 25 + 20 = 100`

## 3. Scoring Defects Identified and Fixed

### 3.1 Acceptance actions inflating concession reciprocity

**Confirmed defect:** Acceptance actions could be included when calculating concession reciprocity, even though an acceptance repeats or resolves around the accepted offer rather than representing a new counteroffer concession.

**Fix:** Concession reciprocity now counts only counteroffer actions. Acceptance and rejection actions are excluded from concession movement calculations.

### 3.2 Deadlock score cap mismatch

**Confirmed defect:** The deadlock score could differ from the displayed breakdown because the displayed result did not consistently apply the deadlock cap.

**Fix:** An explicit deadlock score cap adjustment was added so the overall result and the displayed metric breakdown remain consistent.

## 4. Automated Test Results

- **Scoring tests:** 24 passed.
- **Complete test suite:** 334 passed, 0 failed, 1 warning.

These results were obtained from the working tree at the time of testing, including uncommitted changes that were present then. They describe the tested state of the repository at that time and should not be treated as a clean, committed baseline.

## 5. Manual Testing Results

### 5.1 AI vs AI scenarios

#### Vendor Pricing

- Outcome: Accepted after 3 turns.
- Final price: ₹36,460.
- Overall score: **63.92/100**.
- Metric scores:
  - Surplus Efficiency: 17.52/30
  - Concession Reciprocity: 12.50/25
  - Pacing & Efficiency: 22.22/25
  - Boundary Safety: 11.68/20

#### Job Offer

- Outcome: Accepted after 11 turns.
- Final salary: 13.8 LPA.
- Remote work: 2 days.
- Overall score: **42.01/100**.
- Metric scores:
  - Surplus Efficiency: 12/30
  - Concession Reciprocity: 10.90/25
  - Pacing & Efficiency: 11.11/25
  - Boundary Safety: 8/20
- Observation: The accepted negotiation was labelled **"Impasse / High Friction Resolution"**.

#### Project Budget Allocation

- Outcome: Accepted after 7 turns.
- Final allocation: ₹69.85 lakh.
- Overall score: **66.37/100**.
- Metric scores:
  - Surplus Efficiency: 29.55/30
  - Concession Reciprocity: 10.30/25
  - Pacing & Efficiency: 16.67/25
  - Boundary Safety: 9.85/20
- Observation: The accepted negotiation was labelled **"One-Sided / Suboptimal Agreement"**.

### 5.2 Vendor Pricing Practice Mode

- Mode: Human Buyer vs AI Vendor.
- Outcome: Accepted at ₹38,563.
- Overall score: **50.96/100**.
- Metric scores:
  - Surplus Efficiency: 17.24/30
  - Concession Reciprocity: 0/25
  - Pacing & Efficiency: 22.22/25
  - Boundary Safety: 11.50/20
- AI Coach suggestion: ₹38,563 after the vendor countered at ₹37,125.
- Observation: The midpoint calculation was correct, but the Coach suggestion's strategic usefulness for the Buyer needs review.

The Practice Mode reciprocity score is an observation from manual testing, not a confirmed scoring defect.

## 6. Manual Test Summary

| Scenario / Mode | Outcome | Final Result | Overall Score | Metric Subscores | Arithmetic Check |
|---|---|---|---:|---|---|
| Vendor Pricing (AI vs AI) | Accepted after 3 turns | ₹36,460 | 63.92/100 | 17.52 / 12.50 / 22.22 / 11.68 | Passed: 17.52 + 12.50 + 22.22 + 11.68 = 63.92 |
| Job Offer (AI vs AI) | Accepted after 11 turns | 13.8 LPA; Remote work 2 days | 42.01/100 | 12.00 / 10.90 / 11.11 / 8.00 | Passed: 12 + 10.90 + 11.11 + 8 = 42.01 |
| Project Budget Allocation (AI vs AI) | Accepted after 7 turns | ₹69.85 lakh | 66.37/100 | 29.55 / 10.30 / 16.67 / 9.85 | Passed: 29.55 + 10.30 + 16.67 + 9.85 = 66.37 |
| Vendor Pricing Practice Mode | Accepted | Human Buyer at ₹38,563 | 50.96/100 | 17.24 / 0 / 22.22 / 11.50 | Passed: 17.24 + 0 + 22.22 + 11.50 = 50.96 |

All four displayed overall scores are arithmetically consistent with their metric breakdowns.

## 7. Observations for Further Review

The following items are observations for review and are **not** additional confirmed defects:

1. The Job Offer negotiation was accepted but labelled "Impasse / High Friction Resolution"; the quality tier classification for accepted, high-friction outcomes should be reviewed.
2. The Project Budget Allocation negotiation was accepted but labelled "One-Sided / Suboptimal Agreement"; the relationship between the outcome label and the 66.37 overall score should be reviewed for clarity.
3. Vendor Pricing Practice Mode produced a 0/25 Concession Reciprocity score. This is a manual observation and should be analysed further before any defect is confirmed.
4. The AI Coach calculated ₹38,563 correctly as the midpoint after the vendor counteroffer at ₹37,125, but its strategic usefulness for the Human Buyer in that negotiation needs review.
5. The existing [Milestone 4 report](milestone4_report.md) describes a different formula: agreement outcome 40%, pacing efficiency 20%, concession reciprocity 20%, and boundary safety 20%. The implemented formula in this report uses Surplus Efficiency 30%, Concession Reciprocity 25%, Pacing & Efficiency 25%, and Boundary Safety 20%. This difference needs reconciliation with the existing report. This new report does not modify the existing report.

## 8. Conclusion

The Resolution Quality Scoring Engine was tested through 24 passing scoring tests and the full suite completed with 334 passes, 0 failures, and 1 warning. Manual testing covered three AI vs AI scenarios and Vendor Pricing Practice Mode, and all displayed metric breakdowns passed score arithmetic checks.

Two confirmed defects were identified and fixed: acceptance/rejection actions affecting reciprocity and a deadlock cap mismatch with the displayed breakdown. The remaining items, including the accepted-negotiation labels, Practice Mode reciprocity result, Coach suggestion usefulness, and formula reconciliation with the existing Milestone 4 report, require further review rather than being reported as confirmed defects.
