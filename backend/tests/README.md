# Backend Testing Guide

## Setup

### Install Dependencies

For development (includes testing dependencies):
```bash
pip install -e ".[dev]"
```

For production only:
```bash
pip install .
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run tests with coverage report
```bash
pytest --cov=app --cov-report=html
```

### Run specific test file
```bash
pytest tests/test_auth.py
```

### Run tests by marker
```bash
pytest -m auth          # Run only authentication tests
pytest -m transactions  # Run only transaction tests
pytest -m unit          # Run only unit tests
pytest -m integration   # Run only integration tests
```

### Run tests in verbose mode
```bash
pytest -v
```

### Run tests and stop at first failure
```bash
pytest -x
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Shared fixtures and configuration
├── test_setup.py         # Basic setup verification tests
├── test_auth.py          # Authentication tests
├── test_transactions.py  # Transaction management tests
└── test_projections.py   # Financial projection tests
```

## Available Fixtures

### Application Fixtures
- `app`: Flask application instance with test configuration
- `client`: Test client for making HTTP requests
- `runner`: CLI runner for testing commands

### User Fixtures
- `test_user`: Creates a test user with credentials
- `second_user`: Creates a second test user for multi-user tests
- `auth_token`: JWT token for the test user
- `auth_headers`: Authorization headers with Bearer token

### Transaction Fixtures
- `test_transaction`: Creates a single test transaction
- `multiple_transactions`: Creates multiple test transactions

## Writing Tests

### Example: Testing an endpoint
```python
def test_get_transactions(client, auth_headers, test_transaction):
    """Test retrieving transactions."""
    response = client.get('/api/transactions', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) > 0
```

### Example: Testing with markers
```python
@pytest.mark.auth
def test_login(client, test_user):
    """Test user login."""
    response = client.post('/api/auth/login', json={
        'username': test_user['username'],
        'password': test_user['password']
    })
    assert response.status_code == 200
```

## Coverage Reports

After running tests with coverage, view the HTML report:
```bash
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

## CI/CD Integration

Tests should be run before deployment. The Ansible playbook will be configured to:
1. Install dev dependencies
2. Run pytest
3. Abort deployment if tests fail
4. Proceed with deployment if tests pass

