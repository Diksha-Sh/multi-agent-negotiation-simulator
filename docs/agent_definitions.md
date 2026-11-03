# Agent Definitions: Roles, Goals, Constraints and Personalities

Task 1 deliverable: a document defining each agent's role, goal, constraints and personality.

The machine-readable versions are `scenarios/personalities.json` and the scenario files in `scenarios/`. This document mirrors them, so update both together.

## 1. Personalities

Every agent has exactly one personality. The value must be spelled exactly `Aggressive`, `Collaborative` or `Risk-Averse`: the capital letters and the hyphen matter.

| Personality | What it means | Opening stance | Concession style | Risk attitude | Example phrase |
|---|---|---|---|---|---|
| **Aggressive** | Pushes hard for the best possible deal for its own side. Opens with an ambitious demand and gives ground slowly, only in return for something. | High first ask, set well beyond its target to anchor the negotiation in its favour. | Slow and small. Concedes late, in small steps, and only when the other side concedes first. | Willing to risk a breakdown and will threaten to walk away to put pressure on the other side, but never goes past its own limits. | "That number doesn't work for us. If you want this deal, you'll need to do much better." |
| **Collaborative** | Looks for a deal that works for both sides. Shares its reasoning openly and trades on the items each side cares about most. | Fair first offer, close to what it believes is a reasonable middle ground. | Steady and reciprocal. Matches the other side's concessions and trades a less important item for a more important one. | Prefers to keep talking rather than walk away, and treats a breakdown as a loss for both sides. | "If we can agree on the delivery date, I'm happy to be flexible on the payment terms." |
| **Risk-Averse** | Cares most about reaching a safe, certain deal inside its limits, even if that means leaving some value on the table. | Cautious first offer that stays comfortably inside its limits. | Gives ground fairly readily when talks stall, to avoid the risk of no deal. | Avoids walking away and accepts a reasonable offer early rather than gamble on getting a better one. | "This offer is within what we can accept, so let's close the deal now rather than drag it out." |

**What all three have in common:** the personality changes *how* an agent negotiates (its first offer, how fast it concedes and how readily it walks away), never *what* it is allowed to accept. No personality ever agrees to terms outside the agent's own limits.

The scenario file sets each agent's `default_personality`. The user can change it on the Agent Configuration screen, and the final config then carries the user's choice as `personality`.

## 2. Agents per scenario

Limits use ≥ for `min` (the agent will not go below this) and ≤ for `max` (the agent will not go above this).

### Job Offer Negotiation (`job_offer`)

| Agent | Role | Goal | Constraints | Limits | Default personality |
|---|---|---|---|---|---|
| Job Candidate | Software Developer Candidate | Secure a salary of at least 12 LPA and two remote workdays per week. | Minimum acceptable salary is 12 LPA. Prefers at least two remote workdays per week. | salary ≥ 12 lakh INR per year; remote_days ≥ 2 days per week | Collaborative |
| Hiring Manager | Engineering Hiring Manager | Hire the candidate at a salary no higher than 15 LPA with at most three remote workdays per week. | Maximum salary budget is 15 LPA. Allows no more than three remote workdays per week. | salary ≤ 15 lakh INR per year; remote_days ≤ 3 days per week | Risk-Averse |

A deal is possible: salary 12 to 15 LPA, remote days 2 to 3 per week.

### Vendor Pricing Negotiation (`vendor_pricing`)

| Agent | Role | Goal | Constraints | Limits | Default personality |
|---|---|---|---|---|---|
| Buyer | Procurement Manager | Purchase the products at a price of no more than 37000 INR while meeting the required order quantity. | Maximum acceptable purchase price is 40000 INR. Prefers a lower price while ensuring the required quantity is supplied. | price ≤ 40000 INR | Collaborative |
| Vendor | Sales Representative | Sell the products at a price of at least 38000 INR while retaining the buyer's interest. | Minimum acceptable selling price is 35000 INR. Prefers a higher selling price while maintaining a successful business agreement. | price ≥ 35000 INR | Risk-Averse |

A deal is possible: price 35000 to 40000 INR.

### Project Budget Allocation (`project_budget_allocation`)

| Agent | Role | Goal | Constraints | Limits | Default personality |
|---|---|---|---|---|---|
| Project Manager | Project Manager | Secure at least 60 lakh INR for project activities while ensuring the total budget does not exceed 100 lakh INR. | At least 60 lakh INR must be allocated to project activities. Total project budget must not exceed 100 lakh INR. | project_allocation ≥ 60 lakh INR; total_budget ≤ 100 lakh INR | Collaborative |
| Finance Manager | Finance Manager | Limit project activity allocation to at most 80 lakh INR and keep total project spending within 100 lakh INR. | Project allocation must not exceed 80 lakh INR. Total spending must not exceed 100 lakh INR. | project_allocation ≤ 80 lakh INR; total_budget ≤ 100 lakh INR | Risk-Averse |

A deal is possible: project allocation can be 60 to 80 lakh INR. Both agents have a maximum for total budget, with no minimum, so the current validator does not calculate a range for that item.

## 3. Validation rules

`backend/validation.py` → `validate_config(config)` checks the final config before Start is enabled:

| # | Check | Example error shown in the UI |
|---|---|---|
| 1 | A scenario is selected | No scenario selected. |
| 2 | At least 2 agents | A negotiation needs at least 2 agents, found 1. |
| 3 | Every agent has a name, role, goal and at least one constraint | Agent 'vendor' has no goal. |
| 4 | Every agent's personality is Aggressive, Collaborative or Risk-Averse | Agent 'vendor' has no personality selected. |
| 5 | Every agent has at least 1 limit, and each limit has an item, a type of `min` or `max`, and a numeric value | Agent 'buyer' has no limits. |
| 6 | A deal is possible: for each item, the lowest `max` is at least the highest `min` | No deal is possible on 'price': agent 'buyer' will not go above 30000 but agent 'vendor' will not go below 35000. |

It returns `{"valid": true, "errors": []}` or `{"valid": false, "errors": [...]}` and reports every problem at once. It never raises an exception, even on missing or malformed input.
