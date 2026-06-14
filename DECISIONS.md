# Architecture & Product Design Decisions

This document details the engineering and product decisions made during the design and development of the Shared Expenses Manager application.

## 1. Database Choice: Relational (MySQL) vs Document (MongoDB)

- **Decision**: Use MySQL (relational database via Sequelize ORM) instead of MongoDB.
- **Alternatives Considered**: MongoDB (NoSQL).
- **Rationale**:
  - The application relies heavily on structured, transactional relations (Users, Groups, Members, Expenses, Participants, Settlements).
  - Transaction integrity is crucial: when adding an expense, the expense details and individual participant splits must succeed or fail together (ACID properties).
  - Normalization prevents anomalies. For example, if a group member's name changes, updating it in the `GroupMembers` table updates it globally, avoiding inconsistencies.
- **Trade-offs**: Writes are slightly slower due to transaction overhead, and the schema is less flexible than MongoDB's document model. However, strict typing and constraints align with financial application requirements.

## 2. Modeling Historical Group Membership (Join/Leave Dates)

- **Decision**: Store `joinDate` and `leaveDate` directly in the `GroupMembers` table.
- **Alternatives Considered**:
  - Store active memberships inside each expense (ad-hoc snapshots).
  - Create a separate `MembershipHistory` table.
- **Rationale**:
  - Storing `joinDate` and `leaveDate` directly in the `GroupMembers` junction table keeps the schema clean and simplifies queries.
  - Adding join/leave constraints to queries ensures that we only include members whose active membership span covers the expense `date`.
- **Trade-offs**: When importing historical CSV files, we must dynamically check and potentially expand a member's active interval or flag it as an anomaly. This validation logic is handled in the application layer.

## 3. Registered Users vs Guest Members

- **Decision**: `GroupMembers` supports both registered system users and unregistered guest users by making the `userId` field nullable.
- **Alternatives Considered**:
  - Force every member to register an account first.
  - Keep guest names completely separated from database users.
- **Rationale**:
  - Real-world flatmates frequently want to add expenses for guests, roommates who haven't registered, or historical entries.
  - Making `userId` nullable allows a member to be a "guest". The name is stored directly in `GroupMembers`.
  - Guests can be "linked" to a user account later once the user registers, preserving all historical transaction links.
- **Trade-offs**: The backend must handle checks to ensure names remain unique within a group, and queries must fall back to the `GroupMembers.name` field instead of assuming a join on `Users`.

## 4. Anomaly Resolution & Processing Flow

- **Decision**: An asymmetric staging approach for CSV Imports.
- **Alternatives Considered**:
  - **Fail Fast**: Reject the entire file if any anomaly is detected.
  - **Silent Correction**: Automatically clean and import everything without user review.
- **Rationale**:
  - CSV files created in Excel are often prone to formatting discrepancies, duplicates, or missing information. A fail-fast approach frustrates the user, while silent correction hides errors.
  - Staging the rows in the `ImportReports` and `Anomalies` tables allows the user to see exactly what failed, edit values directly, approve/dismiss duplicates, and then proceed with importing only valid data.
- **Trade-offs**: Requires building a staging UI and managing an `Anomaly` table with multiple states (`PENDING`, `APPROVED`, etc.), adding development complexity.

## 5. Debt Simplification Algorithm

- **Decision**: Greedy transaction minimization algorithm.
- **Alternatives Considered**:
  - Minimal Spanning Tree (MST) approach.
  - Maximum Flow (Ford-Fulkerson) min-cost path routing.
- **Rationale**:
  - The greedy matching algorithm (pairing the debtor with the largest debt with the creditor with the largest credit) runs in \(O(N \log N)\) time, is easy to understand, and generates the minimum number of total transfers (at most \(N - 1\) transactions for \(N\) members).
  - While it doesn't always guarantee the minimum *sum* of money transferred, in a flatmate settlement scenario, minimizing the *number of transfers* (Who Pays Whom) is the primary user goal.
- **Trade-offs**: Can sometimes suggest a payment that does not match personal relationship preferences (e.g., Alice paying Charlie directly, even though Alice only owes Bob, and Bob owes Charlie). However, the ease of settlement outweighs this.

## 6. Currency Handling

- **Decision**: Dual base values with currency conversion stored on each record.
- **Alternatives Considered**:
  - Convert and store only in a single base currency (INR).
  - Dynamically query exchange rates on every page load.
- **Rationale**:
  - Storing the original amount, original currency, conversion rate, and converted INR value preserves historical audit integrity. If exchange rates fluctuate, past transaction math remains locked and correct.
  - Calculating balances is done in the unified currency (INR) to allow adding USD and INR expenses together seamlessly.
- **Trade-offs**: Requires keeping a local cache of `ExchangeRates` and storing extra fields per transaction.
