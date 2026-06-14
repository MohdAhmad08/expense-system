# Shared Expenses Manager

A complete, production-ready web application designed for managing shared flatmate expenses. It implements a clean, modular architecture using **React.js** (frontend) and **Node.js, Express.js, MySQL (via XAMPP)** (backend). It features dynamic membership history tracking, multiple currency support (INR/USD), a robust debt simplification engine, and a CSV import module with automated anomaly detection.

---

## 1. Project Overview & Features

- **JWT Authentication**: Secure user registration, login, logout, and protected route access.
- **Dynamic Group Membership**: Support for historical group memberships. A member's join/leave dates are recorded; expenses occurring outside their active membership window do not affect their balance.
- **Detailed Balance Traceability**: A clear, audit-ready breakdown showing every expense and settlement that contributed to a member's net balance.
- **Multiple Currencies**: Seamlessly record expenses in INR or USD. Converted amounts are calculated using exchange rates and aggregated in INR.
- **Debt Simplification**: A greedy algorithm that minimizes the total number of transactions required to settle the group.
- **CSV Import Engine & Anomaly Detection**: Upload CSV files directly. It parses rows, validates fields, and detects:
  - Duplicate transactions
  - Negative amounts (refunds)
  - Missing currencies (defaults to INR)
  - Invalid dates (normalizes standard formats)
  - Settlements accidentally recorded as expenses
  - Unknown participants (creates guests or maps to existing members)
  - Membership violations

---

## 2. Tech Stack

- **Frontend**: React (Vite), React Router, Tailwind CSS, Axios, PapaParse
- **Backend**: Node.js, Express.js, Sequelize ORM, MySQL (XAMPP), Multer
- **Database**: MySQL (relational, fully normalized)

---

## 3. Getting Started & Installation

### Prerequisites
1. **Node.js** (v16+)
2. **XAMPP** (with MySQL and Apache running)

### Database Setup in XAMPP
1. Open the XAMPP Control Panel and start **Apache** and **MySQL**.
2. Click **Admin** next to MySQL to open `phpMyAdmin` (or go to `http://localhost/phpmyadmin`).
3. Click the **SQL** tab and run the following command to create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS `shared_expenses` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory (see configurations below).
4. Run the backend server in development mode:
   ```bash
   npm run dev
   ```

### Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the React development server:
   ```bash
   npm run dev
   ```

---

## 4. Environment Variables

### Backend Configuration (`backend/.env`)
Create a `.env` file in `backend/` with the following variables:
```env
PORT=5000
NODE_ENV=development

# Database Settings
DB_NAME=shared_expenses
DB_USER=root
DB_PASS=
DB_HOST=127.0.0.1
DB_PORT=3306

# JWT Configuration
JWT_SECRET=super_secret_key_change_in_production
JWT_EXPIRE=30d
```

### Frontend Configuration (`frontend/.env`)
Vite environment variables should be set in `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 5. API Documentation

All routes are prefixed with `/api`.

### Auth Routes
- `POST /auth/register`: Register a new user account.
- `POST /auth/login`: Authenticate a user and receive a JWT token.
- `POST /auth/logout`: Invalidate user session.
- `GET /auth/me`: Get current logged-in user details.

### Group Routes
- `GET /groups`: List all groups the logged-in user belongs to.
- `POST /groups`: Create a new expense group.
- `GET /groups/:id`: Get detailed group info (including members and balances).
- `POST /groups/:id/members`: Add a new member (registered user or guest) with join/leave dates.
- `PUT /groups/:id/members/:memberId`: Edit member details (name, join/leave dates).

### Expense Routes
- `GET /groups/:groupId/expenses`: List all expenses in a group.
- `POST /groups/:groupId/expenses`: Add a new expense (with splits).
- `PUT /expenses/:id`: Update an expense.
- `DELETE /expenses/:id`: Delete an expense.

### Settlement Routes
- `GET /groups/:groupId/settlements`: List all settlements in a group.
- `POST /groups/:groupId/settlements`: Record a new settlement between two members.

### Import / CSV Routes
- `POST /groups/:groupId/import/upload`: Upload an `expenses_export.csv` file using Multer. Returns the import report and parsed anomalies list.
- `GET /groups/:groupId/import/reports`: Fetch historical import reports.
- `GET /import/reports/:reportId/anomalies`: Get list of anomalies for a report.
- `POST /import/anomalies/:anomalyId/resolve`: Resolve an anomaly (e.g. approve duplicate, edit raw data, or ignore).
- `POST /import/reports/:reportId/commit`: Finalize the import after resolving anomalies, writing valid rows to Expenses/Settlements.
