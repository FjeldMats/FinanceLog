# FinanceLog

A personal finance tracking application for managing income and expenses with **AI-powered projections** and visual analytics.

## ✨ What's New

### 🤖 AI-Powered Financial Projections (Latest Update)
- **Prophet Forecasting**: Uses Meta's industry-leading Prophet library for accurate predictions
- **12-Month Forecasts**: See future income, expenses, and savings projections
- **Confidence Intervals**: Visual uncertainty bands show prediction reliability
- **Category-Level Analysis**: Individual forecasts for each spending category
- **Seamless Visualization**: Smooth transitions from historical to projected data
- **Instant Performance**: No animation delays, charts load immediately

The new **Projections** tab provides intelligent forecasting based on your historical transaction data, helping you plan ahead and make informed financial decisions.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed (for local development)
- Ansible installed (for deployment)
- SSH access to remote server (for deployment)

### Deployment Checklist

Before deploying to production:

- [ ] **1. Configure Frontend**
  ```bash
  cp frontend/.env.example frontend/.env
  # Edit REACT_APP_API_URL with your server IP
  ```

- [ ] **2. Configure Backend**
  ```bash
  cp .env.example .env
  # Generate SECRET_KEY: python -c "import secrets; print(secrets.token_hex(32))"
  # Set strong POSTGRES_PASSWORD
  ```

- [ ] **3. Configure Deployment**
  ```bash
  cp deployment/ansible/hosts.example deployment/ansible/hosts
  # Edit with your server IP and SSH username
  ```

- [ ] **4. Deploy**
  ```bash
  cd deployment && ./start_ansible.sh
  # Enter sudo password when prompted
  ```

- [ ] **5. Verify**
  - Visit `http://your-server-ip` in browser
  - Check all containers running: `ssh user@server "docker ps"`

## ⚠️ Security Notice

**Before deploying this application:**
1. ✅ Change all default passwords and credentials
2. ✅ Generate a strong SECRET_KEY for Flask (64-char hex)
3. ✅ Use strong database passwords (16+ characters)
4. ✅ Never commit `.env` files or credentials to version control
5. ✅ Review and update all configuration files with your specific values

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

- **Backend**: Flask (Python), SQLAlchemy ORM, Prophet (Meta's forecasting library)
- **Frontend**: React, Recharts for visualizations, Tailwind CSS
- **Database**: PostgreSQL 17
- **Deployment**: Docker Compose, Ansible
- **AI/ML**: Prophet for time-series forecasting and projections

## Key Components

### Backend (`backend/`)
- **`app/routes.py`** - API endpoints (transactions, projections)
- **`app/models.py`** - Database models (Transaction, User)
- **`app/prophet_service.py`** - 🆕 Prophet forecasting service for AI projections
- **`config.py`** - Database connection and environment config
- **`run.py`** - Application entry point
- **`requirements.txt`** - Python dependencies including Prophet

### Frontend (`frontend/src/`)
- **`components/Dashboard.js`** - Main dashboard with charts
- **`components/TransactionTable.js`** - View/edit/delete transactions with filters
- **`components/TransactionForm.js`** - Add new transactions
- **`components/Categories.js`** - Category breakdown view
- **`components/Projections.js`** - 🆕 AI-powered financial projections with Prophet
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

## Features

### 📊 Financial Tracking
- **Transaction Management**: Add, edit, delete, and filter transactions
- **Category Breakdown**: Visualize spending by category with interactive charts
- **Income & Expense Tracking**: Separate views for income and expenses
- **Monthly Analysis**: Track trends over time with historical data

### 🤖 AI-Powered Projections (NEW!)
- **Prophet Forecasting**: Uses Meta's Prophet library for accurate time-series predictions
- **12-Month Projections**: See future income, expenses, and savings predictions
- **Confidence Intervals**: Visual uncertainty bands show prediction reliability
- **Category-Level Forecasting**: Individual projections for each spending category
- **Seamless Visualization**: Smooth transitions from historical to projected data
- **Real-time Updates**: Projections update as you add new transactions

### 📈 Advanced Visualizations
- **Interactive Charts**: Hover tooltips with detailed information
- **No Animation Delays**: Instant chart loading for better performance
- **Dashed Projection Lines**: Clear visual distinction between actual and projected data
- **Color-Coded Insights**: Green for savings, red for losses, orange for current month
- **Responsive Design**: Works on desktop and mobile devices

## API Endpoints

### Transaction Management
- `GET /api/transactions` - Get all transactions (supports filtering)
- `POST /api/transaction` - Add new transaction
- `PUT /api/transaction/:id` - Update transaction
- `DELETE /api/transaction/:id` - Delete transaction

### AI Projections (NEW!)
- `GET /api/projections/<category>` - Get Prophet-based projections for a category
  - Returns 12-month forecast with confidence intervals
  - Automatically trains on historical transaction data
  - Supports all expense categories plus "Income" and "Total"

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

### Quick Start

**Deploy to server:**
```bash
cd deployment
./start_ansible.sh
```

**First deployment:**
- Prompts for sudo password (to install Docker and add user to docker group)
- Takes ~5-10 minutes (downloads Docker, builds images)

**Subsequent deployments:**
- Still prompts for sudo password, but skips most sudo tasks
- Takes ~30-60 seconds (only rebuilds changed images)
- No password stored anywhere - secure by design!

**Manual deployment:**
```bash
cd deployment
ansible-playbook -i ./ansible/hosts ./ansible/deploy.yml --private-key ~/.ssh/id_rsa --ask-become-pass
```

### Local Development

```bash
# Start all services
docker compose up -d

# Backend runs on: http://localhost:5000
# Frontend runs on: http://localhost:3000
# Database runs on: localhost:5432

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Configuration

### Initial Setup

**⚠️ IMPORTANT: Change all default credentials before deployment!**

#### 1. Frontend Configuration
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env and set REACT_APP_API_URL to your server IP/domain
```

**Example `frontend/.env`:**
```env
REACT_APP_API_URL=http://10.0.0.29/api
GENERATE_SOURCEMAP=false
```

#### 2. Docker Environment
```bash
cp .env.example .env
# Edit .env and set secure database credentials and SECRET_KEY
```

**Example `.env`:**
```env
POSTGRES_DB=finance_tracker
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password_here
SECRET_KEY=your_64_char_hex_secret_key_here
```

**Generate a secure SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

#### 3. Deployment Configuration
```bash
cp deployment/ansible/hosts.example deployment/ansible/hosts
# Edit deployment/ansible/hosts and set your server IP and username
```

**Example `deployment/ansible/hosts`:**
```ini
[webservers]
10.0.0.29 ansible_user=mats
```

**How it works:**
- ✅ **First deployment:** Ansible installs Docker and adds your user to the `docker` group
- ✅ **Subsequent deployments:** Docker commands run without sudo (faster, cleaner)
- ✅ **No password storage:** Your sudo password is never stored anywhere
- ✅ **Secure by design:** Industry-standard approach using Docker group permissions

### Environment Variables Reference

| Variable | File | Description | Example |
|----------|------|-------------|---------|
| `REACT_APP_API_URL` | `frontend/.env` | Backend API URL | `http://10.0.0.29/api` |
| `GENERATE_SOURCEMAP` | `frontend/.env` | Generate source maps | `false` (production) |
| `POSTGRES_DB` | `.env` | Database name | `finance_tracker` |
| `POSTGRES_USER` | `.env` | Database username | `admin` |
| `POSTGRES_PASSWORD` | `.env` | Database password | `strong_password_123` |
| `SECRET_KEY` | `.env` | Flask secret key | `64-char hex string` |
| `ansible_user` | `deployment/ansible/hosts` | SSH username | `mats` |
| Server IP | `deployment/ansible/hosts` | Remote server IP | `10.0.0.29` |

## AI-Powered Projections

### How It Works

The Projections feature uses **Meta's Prophet** library to forecast future financial trends based on your historical transaction data.

#### Prophet Forecasting
- **Time-Series Analysis**: Prophet analyzes patterns in your spending and income over time
- **Seasonality Detection**: Automatically detects weekly, monthly, and yearly patterns
- **Trend Analysis**: Identifies long-term trends in your financial behavior
- **Uncertainty Quantification**: Provides confidence intervals showing prediction reliability

#### What You See
1. **Total Income Projections**: 12-month forecast of expected income
2. **Total Expense Projections**: 12-month forecast of expected expenses
3. **Net Savings/Loss**: Projected monthly savings (income - expenses)
4. **Category Breakdown**: Individual projections for each spending category

#### Visual Elements
- **Solid Blue Line**: Historical actual data
- **Orange Dot**: Current month (in progress)
- **Dashed Green Line**: AI-powered projections
- **Shaded Area**: Confidence interval (prediction uncertainty)
- **Tooltips**: Hover for detailed values and ranges

#### Data Requirements
- **Minimum**: 2 months of historical data
- **Optimal**: 6+ months for better accuracy
- **Updates**: Projections automatically refresh when you add new transactions

### Example Use Cases
- **Budget Planning**: See if you're on track to meet savings goals
- **Expense Forecasting**: Predict upcoming expenses for better cash flow management
- **Income Planning**: Anticipate income fluctuations and plan accordingly
- **Category Analysis**: Identify which categories are trending up or down

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

## Troubleshooting

### Deployment Issues

**"Permission denied" when running Docker commands:**
```bash
# SSH into the server and verify docker group membership
ssh mats@10.0.0.29
groups
# Should show: mats docker ...

# If not in docker group, log out and back in
exit
ssh mats@10.0.0.29
```

**Ansible playbook fails:**
```bash
# Check syntax
cd deployment
ansible-playbook -i ./ansible/hosts ./ansible/deploy.yml --syntax-check

# Run with verbose output
./start_ansible.sh -vvv
```

**Docker containers not starting:**
```bash
# SSH into server
ssh mats@10.0.0.29

# Check container status
docker ps -a

# View logs
docker compose -f ~/FinanceLog/docker-compose.yml logs

# Restart containers
cd ~/FinanceLog
docker compose down
docker compose up -d
```

**Frontend can't connect to backend:**
- Verify `REACT_APP_API_URL` in `frontend/.env` matches your server IP
- Check Nginx is running: `docker ps | grep nginx`
- Test backend directly: `curl http://your-server-ip/api/transactions`

### Local Development Issues

**Port already in use:**
```bash
# Find process using port 5000 (backend)
lsof -i :5000
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

**Database connection errors:**
```bash
# Verify database is running
docker ps | grep postgres

# Check database logs
docker logs postgres_transactions

# Reset database
docker compose down -v  # WARNING: Deletes all data!
docker compose up -d
```

## Database Backups

### Manual Backup

```bash
# Create backup directory
mkdir -p ~/FinanceLog_Backups

# Create backup
docker exec postgres_transactions pg_dump -U admin finance_tracker > ~/FinanceLog_Backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
# Stop the application
cd ~/FinanceLog
docker compose down

# Start only the database
docker compose up -d database

# Restore backup
cat ~/FinanceLog_Backups/backup_20260104_120000.sql | docker exec -i postgres_transactions psql -U admin finance_tracker

# Start all services
docker compose up -d
```

### Automated Backups (Optional)

Add to crontab on the server:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * docker exec postgres_transactions pg_dump -U admin finance_tracker > ~/FinanceLog_Backups/backup_$(date +\%Y\%m\%d).sql

# Keep only last 30 days of backups
0 3 * * * find ~/FinanceLog_Backups -name "backup_*.sql" -mtime +30 -delete
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
- [x] **AI-Powered Projections** - Prophet-based forecasting (COMPLETED!)
- [x] **Confidence Intervals** - Visual uncertainty bands (COMPLETED!)
- [x] **Category-Level Forecasting** - Individual projections per category (COMPLETED!)
- [ ] Budget tracking and alerts
- [ ] Recurring transaction support
- [ ] Export data to CSV/Excel
- [ ] Mobile responsive improvements
- [ ] Dark mode toggle
- [ ] Savings goals and progress tracking
- [ ] Custom date range filtering

### Infrastructure
- [ ] Automated database backups
- [ ] CI/CD pipeline
- [ ] Monitoring and logging
- [ ] HTTPS/SSL configuration

## Notes

### General
- Transactions with positive amounts are income, negative amounts are expenses
- Month filters show in reverse chronological order (latest first)
- Search in TransactionTable matches both description and subcategory fields
- All dashboard cards use consistent styling with `bg-table` class

### Projections
- Prophet requires at least 2 data points (months) to generate forecasts
- More historical data (6+ months) produces more accurate projections
- Projections automatically update when new transactions are added
- Confidence intervals widen for longer-term predictions (normal behavior)
- The current month shows partial actual data plus full-month projection
- Dashed lines indicate projected values, solid lines show actual data

### Performance
- Charts load instantly with animations disabled for better UX
- Prophet forecasts are cached and computed on-demand
- Backend uses efficient SQLAlchemy queries with proper indexing

