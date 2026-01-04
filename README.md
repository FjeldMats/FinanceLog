# FinanceLog

A personal finance tracking application for managing income and expenses with visual analytics.

## ⚠️ Security Notice

**Before deploying this application:**
1. Change all default passwords and credentials
2. Generate a strong SECRET_KEY for Flask
3. Use strong database passwords
4. Never commit `.env` files or credentials to version control
5. Review and update all configuration files with your specific values

See the [Configuration](#configuration) section for detailed setup instructions.

## Project Structure

```
FinanceLog/
├── backend/           # Flask API server
├── frontend/          # React web application
├── database/          # PostgreSQL database
└── deployment/        # Ansible deployment scripts
```

## Architecture

### Application Architecture

```mermaid
graph LR
    A[User Browser] -->|HTTP| B[Nginx :80]
    B -->|Proxy| C[React Frontend :3000]
    C -->|API Calls| D[Flask Backend :5000]
    D -->|SQL| E[PostgreSQL :5432]

    style A fill:#1e3a5f,stroke:#4a90e2,color:#fff
    style B fill:#5f4a1e,stroke:#e2a84a,color:#fff
    style C fill:#1e5f3a,stroke:#4ae28a,color:#fff
    style D fill:#5f1e5a,stroke:#e24ad4,color:#fff
    style E fill:#5f1e2e,stroke:#e24a6a,color:#fff
```

### VM Infrastructure

```mermaid
graph TB
    subgraph Internet
        U[User Browser]
        DEV[Developer Machine]
    end

    subgraph "Remote Server VM"
        subgraph "Docker Network: finance_network"
            N[Nginx Container<br/>:80]
            F[Frontend Container<br/>:3000]
            B[Backend Container<br/>:5000]
            D[Database Container<br/>postgres_transactions<br/>:5432]
        end

        V[Docker Volumes<br/>postgres_data]
        P[Project Files<br/>~/FinanceLog]
    end

    U -->|HTTP :80| N
    DEV -->|SSH + Ansible| P
    N -->|Proxy| F
    F -->|API| B
    B -->|SQL| D
    D -.->|Persist| V
    P -.->|Mount| F
    P -.->|Mount| B
    P -.->|Mount| D

    style U fill:#1e3a5f,stroke:#4a90e2,color:#fff
    style DEV fill:#5f1e5a,stroke:#e24ad4,color:#fff
    style N fill:#5f4a1e,stroke:#e2a84a,color:#fff
    style F fill:#1e5f3a,stroke:#4ae28a,color:#fff
    style B fill:#5f1e5a,stroke:#e24ad4,color:#fff
    style D fill:#5f1e2e,stroke:#e24a6a,color:#fff
    style V fill:#5f1e2e,stroke:#e24a6a,color:#fff
    style P fill:#5f5a1e,stroke:#e2d44a,color:#fff
```

## Tech Stack

- **Backend**: Flask (Python), SQLAlchemy ORM
- **Frontend**: React, Recharts for visualizations, Tailwind CSS
- **Database**: PostgreSQL 17
- **Deployment**: Docker Compose, Ansible

## Key Components

### Backend (`backend/`)
- **`app/routes.py`** - API endpoints (GET/POST/PUT/DELETE transactions)
- **`app/models.py`** - Database models (Transaction, User)
- **`config.py`** - Database connection and environment config
- **`run.py`** - Application entry point

### Frontend (`frontend/src/`)
- **`components/Dashboard.js`** - Main dashboard with charts
- **`components/TransactionTable.js`** - View/edit/delete transactions with filters
- **`components/TransactionForm.js`** - Add new transactions
- **`components/Categories.js`** - Category breakdown view
- **`components/BarChartView.js`** - Monthly expenditure chart
- **`components/IncomeBarChartView.js`** - Monthly income chart
- **`components/StackedChartView.js`** - Expenditure breakdown by category
- **`api.js`** - API client functions
- **`index.css`** - Global styles and Tailwind config

### Database (`database/`)
- **`init/init.sql`** - Database schema
- **`data/`** - CSV files for initial data import

## Database Schema

```mermaid
erDiagram
    TRANSACTIONS {
        int id PK
        date transaction_date
        varchar category
        varchar subcategory
        text description
        numeric amount
    }

    USERS {
        int id PK
        varchar username
        varchar password_hash
    }
```

**transactions** table:
- `id` - Primary key (auto-increment)
- `transaction_date` - Date of transaction (NOT NULL)
- `category` - Main category (Income/Expense type) (NOT NULL)
- `subcategory` - Subcategory (e.g., store name, income source)
- `description` - Optional description
- `amount` - Transaction amount (positive for income, negative for expenses) (NOT NULL)

**users** table (for future multi-user support):
- `id` - Primary key (auto-increment)
- `username` - Unique username (NOT NULL)
- `password_hash` - Hashed password (NOT NULL)

## API Endpoints

- `GET /api/transactions` - Get all transactions (supports filtering)
- `POST /api/transaction` - Add new transaction
- `PUT /api/transaction/:id` - Update transaction
- `DELETE /api/transaction/:id` - Delete transaction

### API Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend API
    participant D as Database

    U->>F: View Dashboard
    F->>B: GET /api/transactions
    B->>D: SELECT * FROM transactions
    D-->>B: Transaction data
    B-->>F: JSON response
    F-->>U: Render charts & tables

    U->>F: Add Transaction
    F->>B: POST /api/transaction
    B->>D: INSERT INTO transactions
    D-->>B: Success
    B-->>F: New transaction data
    F-->>U: Update UI
```

## Deployment

### Deployment Flow

```mermaid
graph TD
    A[Local Development] -->|git push| B[GitHub Repository]
    B -->|ansible-playbook| C[Remote Server]
    C -->|rsync files| D[Project Directory]
    D -->|docker compose build| E[Build Images]
    E -->|docker compose up| F[Running Containers]

    F --> G[Backend Container]
    F --> H[Frontend Container]
    F --> I[Database Container]
    F --> J[Nginx Container]

    style A fill:#1e3a5f,stroke:#4a90e2,color:#fff
    style B fill:#5f1e5a,stroke:#e24ad4,color:#fff
    style C fill:#5f4a1e,stroke:#e2a84a,color:#fff
    style F fill:#1e5f3a,stroke:#4ae28a,color:#fff
```

**Deploy to server:**
```bash
cd deployment
./start_ansible.sh
# You'll be prompted for sudo password on first run (to install Docker)
# After that, no password needed for deployments!
```

Or manually:
```bash
cd deployment
ansible-playbook -i ./ansible/hosts ./ansible/deploy.yml --private-key ~/.ssh/id_rsa --ask-become-pass
```

**Local development:**
```bash
# Start all services
docker compose up -d

# Backend runs on: http://localhost:5000
# Frontend runs on: http://localhost:3000
# Database runs on: localhost:5432
```

## Configuration

### Initial Setup

**⚠️ IMPORTANT: Change all default credentials before deployment!**

1. **Frontend Configuration:**
   ```bash
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env and set REACT_APP_API_URL to your server IP/domain
   ```

2. **Docker Environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set secure database credentials and SECRET_KEY
   ```

3. **Deployment Configuration:**
   ```bash
   cp deployment/ansible/hosts.example deployment/ansible/hosts
   # Edit deployment/ansible/hosts and set your server IP and username
   ```

   **Note:** The playbook automatically adds your user to the `docker` group, so you only need to enter your sudo password during initial setup. Subsequent deployments won't require sudo for Docker commands.

4. **Generate Secure SECRET_KEY:**
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

### Environment Variables

**Frontend (`frontend/.env`):**
- `REACT_APP_API_URL` - Backend API URL (e.g., `http://your-server-ip/api`)
- `GENERATE_SOURCEMAP` - Set to `false` for production

**Backend (`.env` or `docker-compose.yml`):**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Flask secret key (use a strong random value)
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database username
- `POSTGRES_PASSWORD` - Database password (use a strong password)

**Deployment (`deployment/ansible/hosts`):**
- Server IP address
- SSH username
- SSH private key path

## Common Tasks

**Add a new chart/visualization:**
- Create component in `frontend/src/components/`
- Import and use in `Dashboard.js` or `Categories.js`

**Modify transaction filters:**
- Edit filter logic in `TransactionTable.js` (search, category, month filters)

**Change styling:**
- Global styles: `frontend/src/index.css`
- Component-specific: Tailwind classes in component files

**Update database schema:**
- Modify `database/init/init.sql`
- Update `backend/app/models.py` to match
- Rebuild database container

**Add new API endpoint:**
- Add route in `backend/app/routes.py`
- Add client function in `frontend/src/api.js`
- Use in React components

## Environment Variables

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Flask secret key

**Frontend:**
- `REACT_APP_API_URL` - Backend API URL (e.g., `http://10.0.0.29:5000/api`)

## Database Backups

Database backups are stored in: `~/FinanceLog_Backups/`

To create a new backup:
```bash
docker exec postgres_transactions pg_dump -U admin finance_tracker > ~/FinanceLog_Backups/backup_$(date +%Y%m%d).sql
```

## Future Improvements

### Authentication & Multi-User Support
- [ ] Add login screen
- [ ] Implement user authentication system
- [ ] Separate transaction data per user
- [ ] Store session data (Redis or database-backed sessions)
- [ ] Decide on deployment strategy with authentication (OAuth, JWT, etc.)

#### Planned Authentication Architecture

```mermaid
graph TB
    A[User Browser] -->|Login Request| B[Login Screen]
    B -->|POST /api/login| C[Flask Backend]
    C -->|Validate Credentials| D[Users Table]
    D -->|Success| E[Generate JWT/Session]
    E -->|Store Session| F[Redis/Session Store]
    E -->|Return Token| B
    B -->|Store Token| G[Browser Storage]

    G -->|Authenticated Request| H[API Endpoints]
    H -->|Verify Token| F
    F -->|Valid| I[Access User's Transactions]
    I -->|Filter by user_id| J[Transactions Table]

    style A fill:#1e3a5f,stroke:#4a90e2,color:#fff
    style B fill:#5f4a1e,stroke:#e2a84a,color:#fff
    style C fill:#5f1e5a,stroke:#e24ad4,color:#fff
    style F fill:#5f1e2e,stroke:#e24a6a,color:#fff
    style J fill:#1e5f3a,stroke:#4ae28a,color:#fff
```

#### Future Data Model with Auth

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : owns
    USERS {
        int id PK
        varchar username UK
        varchar password_hash
        varchar email
        timestamp created_at
    }

    TRANSACTIONS {
        int id PK
        int user_id FK
        date transaction_date
        varchar category
        varchar subcategory
        text description
        numeric amount
    }

    SESSIONS {
        varchar session_id PK
        int user_id FK
        timestamp created_at
        timestamp expires_at
    }

    USERS ||--o{ SESSIONS : has
```

### Features
- [ ] Budget tracking and alerts
- [ ] Recurring transaction support
- [ ] Export data to CSV/Excel
- [ ] Mobile responsive improvements
- [ ] Dark mode toggle

### Infrastructure
- [ ] Automated database backups
- [ ] CI/CD pipeline
- [ ] Monitoring and logging
- [ ] HTTPS/SSL configuration

## Notes

- Transactions with positive amounts are income, negative amounts are expenses
- Month filters show in reverse chronological order (latest first)
- Search in TransactionTable matches both description and subcategory fields
- All dashboard cards use consistent styling with `bg-table` class

