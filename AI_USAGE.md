# AI Tool Usage and Log

This document records the interactions with the AI assistant (Antigravity) and how developmental challenges were identified and addressed during the project.

## 1. AI Assistant Details
- **AI Assistant**: Antigravity (Google DeepMind Advanced Agentic Coding team)
- **Model**: Gemini 3.5 Flash (Medium)

## 2. Core Prompts Used
- **Project Initialization**: Requested a modular, production-ready MERN-like web app (Node/Express, React, MySQL, Sequelize, JWT, Tailwind, Multer, PapaParse) with historical memberships (join/leave dates), traceable balances, debt simplification, and a robust CSV Import & Anomaly Detection system.
- **Incremental Prompts**: User approved the technical design artifact and ordered the execution phase to begin.

## 3. Notable AI Challenges & Corrections

### A. Artifact Path vs. Workspace Path Misrouting
- **Mistake**: When generating the `implementation_plan.md` file, the AI mistakenly designated the workspace project folder (`c:\Users\mohda\OneDrive\Pictures\Documents\AI\Desktop\project`) as an artifact path while providing `ArtifactMetadata`.
- **Symptom**: The tool returned a validation error stating the path was invalid because artifacts must reside in the dedicated app data directory: `C:\Users\mohda\.gemini\antigravity\brain\<conversation-id>/`.
- **Correction**: Split the file generation into two categories:
  1. *Artifacts*: Saved in the app data directory with `ArtifactMetadata` (e.g., `implementation_plan.md`, `task.md`, `walkthrough.md`).
  2. *Project Files*: Saved in the workspace directory without `ArtifactMetadata` (e.g., `package.json`, source code files, docs).

### B. Group Membership Historical Date Integrity
- **Challenge**: Defining the logic to prevent a user from owing money for an expense if they were not in the group on that date.
- **Solution**: The AI realized that when calculating balances, we cannot simply execute an `INNER JOIN` on `ExpenseParticipants` and `Expenses`. We must check:
  `GroupMembers.joinDate <= Expenses.date AND (GroupMembers.leaveDate IS NULL OR Expenses.date <= GroupMembers.leaveDate)`.
  If a participant was added to an expense outside this range, the CSV import flags it as a `Membership Violation` anomaly, and the UI blocks it.

### C. Greedy Debt Simplification Precision
- **Challenge**: The greedy debt simplification algorithm matches debtor to creditor. Due to floating-point representation in JavaScript, calculations can leave trace remainders (e.g., `0.0000000001`).
- **Solution**: Applied a precision threshold (`Math.abs(balance) < 0.01`) to treat fully settled balances as exactly zero, and rounded all transaction proposals to two decimal places.

### D. Timezone Offset Discrepancies in Date Normalization
- **Mistake/Challenge**: A unit test parsing `'June 13, 2026'` failed because formatting via `.toISOString().split('T')[0]` returned `'2026-06-12'`.
- **Symptom**: Because `.toISOString()` returns the timestamp in UTC, local midnight dates are shifted back by the local timezone offset (e.g., GMT+05:30 shifts back 5 hours and 30 minutes, pushing the date to the previous day).
- **Correction**: Replaced UTC conversion with local calendar getters: `parsed.getFullYear()`, `parsed.getMonth()`, and `parsed.getDate()` to form the date string.

