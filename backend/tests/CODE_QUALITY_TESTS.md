# Code Quality Tests

## Overview
Automated tests to ensure code quality, maintainability, and best practices.

## Available Tests

### 1. `test_no_unused_imports`
Checks for unused import statements in the codebase.

**Current Issues Found:**
- `datetime.timedelta` in `auth_utils.py`
- `app.models.Transaction` in `database.py`
- `flask.session` in `routes.py`
- `flask_cors.cross_origin` in `routes.py`
- `app.models.User` in `routes.py`
- `sqlalchemy.text` in `routes.py`
- `statsmodels.tsa.seasonal.seasonal_decompose` in `routes.py`
- `datetime.timedelta` in `routes.py`

**Fix:** Run `autoflake --in-place --recursive --remove-all-unused-imports app/`

### 2. `test_no_unused_variables`
Checks for unused variables in the codebase.

**Status:** ✅ PASSING (no unused variables found)

### 3. `test_flake8_style`
Checks code style compliance with PEP 8 standards.

**Current Issues Found:**
- Missing blank lines between functions (E302)
- Too many blank lines (E303)
- Inline comment spacing (E261)
- Blank line at end of file (W391)
- Unused function argument `current_user` in auth_routes.py (U100)

**Fix:** Run `autopep8 --in-place --recursive app/` or fix manually

### 4. `test_no_hardcoded_secrets`
Checks for hardcoded passwords, API keys, tokens, or secrets.

**Status:** ✅ PASSING (no hardcoded secrets found)

### 5. `test_no_print_statements`
Checks for print() statements (should use logging instead).

**Status:** ✅ PASSING (no print statements found)

### 6. `test_no_unused_dependencies`
Checks that all dependencies in `pyproject.toml` are actually used.

**Status:** ✅ PASSING (all dependencies are used)

**Note:** The following are indirect dependencies (used by other packages):
- `alembic` - Used by Flask-Migrate
- `psycopg2-binary` - PostgreSQL driver for SQLAlchemy
- `scipy` - Dependency of statsmodels
- `blinker`, `click`, `greenlet`, `itsdangerous`, `Jinja2`, `Mako`, `MarkupSafe`, `typing_extensions`, `Werkzeug` - Flask dependencies

## Running the Tests

### Run all code quality tests:
```bash
pytest tests/test_code_quality.py -v
```

### Run specific test:
```bash
pytest tests/test_code_quality.py::test_no_unused_imports -v
```

### Run with detailed output:
```bash
pytest tests/test_code_quality.py -v --tb=short
```

## Automated Fixes

### Remove unused imports:
```bash
autoflake --in-place --recursive --remove-all-unused-imports app/
```

### Remove unused variables:
```bash
autoflake --in-place --recursive --remove-unused-variables app/
```

### Fix style issues:
```bash
autopep8 --in-place --recursive app/
```

### Or fix everything at once:
```bash
autoflake --in-place --recursive --remove-all-unused-imports --remove-unused-variables app/
autopep8 --in-place --recursive app/
```

## Integration with CI/CD

These tests should be run:
1. **Before committing** - Use pre-commit hooks
2. **In CI pipeline** - Fail builds on quality issues
3. **Before deployment** - Part of the Ansible pre-deployment checks

## Benefits

1. **Cleaner Code** - Removes dead code and unused imports
2. **Better Maintainability** - Consistent style makes code easier to read
3. **Security** - Prevents hardcoded secrets from being committed
4. **Smaller Bundles** - Removing unused dependencies reduces package size
5. **Best Practices** - Enforces Python community standards (PEP 8)

## Current Status

- ✅ 3/6 tests passing
- ❌ 3/6 tests failing (fixable with automated tools)

**Next Steps:**
1. Run automated fixes to clean up the code
2. Add these tests to the cleanup tasks
3. Integrate into pre-commit hooks
4. Add to CI/CD pipeline

