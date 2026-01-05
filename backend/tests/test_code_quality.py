"""
Code quality tests to ensure clean, maintainable code.
Tests for unused imports, unused variables, and code style issues.
"""
import pytest
import subprocess
import os


def test_no_unused_imports():
    """Test that there are no unused imports in the codebase."""
    # Get the app directory path
    app_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')

    # Use flake8 to get detailed unused import information
    result = subprocess.run(
        ['flake8', app_dir, '--select=F401'],
        capture_output=True,
        text=True
    )

    # If flake8 finds unused imports, it will exit with code 1
    if result.returncode != 0:
        error_msg = "Found unused imports:\n\n"
        error_msg += result.stdout
        error_msg += "\nRun 'autoflake --in-place --recursive --remove-all-unused-imports app/' to fix."

        pytest.fail(error_msg)


def test_no_unused_variables():
    """Test that there are no unused variables in the codebase."""
    app_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
    
    # Run autoflake to check for unused variables
    result = subprocess.run(
        ['autoflake', '--check', '--recursive', '--remove-unused-variables', app_dir],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        output_lines = result.stdout.strip().split('\n')
        files_with_issues = [line for line in output_lines if line.startswith('---')]
        
        error_msg = "Found unused variables in the following files:\n"
        error_msg += "\n".join(files_with_issues)
        error_msg += "\n\nRun 'autoflake --in-place --recursive --remove-unused-variables app/' to fix."
        
        pytest.fail(error_msg)


def test_flake8_style():
    """Test that code follows PEP 8 style guidelines using flake8."""
    app_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
    
    # Run flake8 with reasonable settings
    result = subprocess.run(
        [
            'flake8',
            app_dir,
            '--max-line-length=120',  # Allow slightly longer lines
            '--extend-ignore=E203,W503',  # Ignore some formatting rules that conflict with black
            '--exclude=__pycache__,*.pyc,.git,migrations',
        ],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        error_msg = "Flake8 found style issues:\n\n"
        error_msg += result.stdout
        error_msg += "\n\nFix these issues to maintain code quality."
        
        pytest.fail(error_msg)


@pytest.mark.slow
def test_no_hardcoded_secrets():
    """Test that there are no hardcoded secrets or sensitive data in the code."""
    app_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')

    # Patterns that might indicate hardcoded secrets (actual string values, not variable assignments)
    dangerous_patterns = [
        r'password\s*=\s*["\'][^"\']{8,}["\']',  # password = "actualpassword123"
        r'secret_key\s*=\s*["\'][^"\']{8,}["\']',  # secret_key = "actualsecret"
        r'api_key\s*=\s*["\'][^"\']{8,}["\']',   # api_key = "actualkey"
        r'jwt_secret\s*=\s*["\'][^"\']{8,}["\']',  # jwt_secret = "actualsecret"
    ]

    issues = []

    for root, dirs, files in os.walk(app_dir):
        # Skip __pycache__ directories
        dirs[:] = [d for d in dirs if d != '__pycache__']

        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                    lines = content.split('\n')

                    for i, line in enumerate(lines, 1):
                        # Skip comments
                        if line.strip().startswith('#'):
                            continue

                        # Check for suspicious patterns
                        for pattern in dangerous_patterns:
                            import re
                            if re.search(pattern, line, re.IGNORECASE):
                                # Exclude known safe patterns
                                if 'os.getenv' in line or 'config' in line.lower() or "data['" in line:
                                    continue

                                issues.append(f"{filepath}:{i}: {line.strip()}")

    if issues:
        error_msg = "Found potential hardcoded secrets:\n\n"
        error_msg += "\n".join(issues)
        error_msg += "\n\nUse environment variables or config files instead."

        pytest.fail(error_msg)


def test_no_print_statements():
    """Test that there are no print() statements in production code (use logging instead)."""
    app_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')

    issues = []

    for root, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d != '__pycache__']

        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    lines = f.readlines()

                    for i, line in enumerate(lines, 1):
                        # Skip comments
                        if line.strip().startswith('#'):
                            continue

                        # Check for print statements (but not Blueprint, pprint, etc.)
                        import re
                        if re.search(r'\bprint\s*\(', line):
                            issues.append(f"{filepath}:{i}: {line.strip()}")

    if issues:
        error_msg = "Found print() statements in production code:\n\n"
        error_msg += "\n".join(issues)
        error_msg += "\n\nUse proper logging instead of print() statements."

        pytest.fail(error_msg)


def test_no_unused_dependencies():
    """Test that all dependencies in pyproject.toml are actually used."""
    import tomli
    import re

    # Read pyproject.toml
    pyproject_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'pyproject.toml')
    with open(pyproject_path, 'rb') as f:
        pyproject = tomli.load(f)

    # Get production dependencies
    dependencies = pyproject['project']['dependencies']

    # Map of package names to their import names (some differ)
    package_to_import = {
        'Flask': 'flask',
        'Flask-Cors': 'flask_cors',
        'Flask-SQLAlchemy': 'flask_sqlalchemy',
        'Flask-Migrate': 'flask_migrate',
        'SQLAlchemy': 'sqlalchemy',
        'PyJWT': 'jwt',
        'psycopg2-binary': 'psycopg2',
    }

    # Extract package names from dependencies (remove version specifiers)
    package_names = []
    for dep in dependencies:
        # Remove version specifiers like ==1.0.0
        package_name = re.split(r'[=<>!]', dep)[0].strip()
        package_names.append(package_name)

    # Get all Python files in app directory
    app_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
    all_imports = set()

    for root, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d != '__pycache__']

        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()

                    # Find all import statements
                    import_pattern = r'^\s*(?:from|import)\s+([a-zA-Z0-9_]+)'
                    matches = re.findall(import_pattern, content, re.MULTILINE)
                    all_imports.update(matches)

    # Check which packages are not imported
    unused_packages = []
    for package in package_names:
        # Get the import name
        import_name = package_to_import.get(package, package.lower().replace('-', '_'))

        # Check if this package or its submodules are imported
        is_used = False
        for imp in all_imports:
            if imp.startswith(import_name) or import_name.startswith(imp):
                is_used = True
                break

        # Some packages are used indirectly (dependencies of other packages or used by tools)
        indirect_deps = [
            'blinker', 'click', 'greenlet', 'itsdangerous', 'Jinja2',
            'Mako', 'MarkupSafe', 'typing_extensions', 'Werkzeug',
            'alembic',  # Used by Flask-Migrate for database migrations
            'psycopg2-binary',  # PostgreSQL driver used by SQLAlchemy
            'scipy',  # Dependency of statsmodels
        ]

        if not is_used and package not in indirect_deps:
            unused_packages.append(package)

    if unused_packages:
        error_msg = "Found potentially unused dependencies in pyproject.toml:\n\n"
        error_msg += "\n".join(f"  - {pkg}" for pkg in unused_packages)
        error_msg += "\n\nThese packages may be unused or only used indirectly."
        error_msg += "\nVerify if they are needed and remove if not."

        pytest.fail(error_msg)

