"""
Pytest configuration and fixtures for testing the Flask application.
This file provides reusable test fixtures for database setup, app context, and test data.
"""
import pytest
from app import create_app, db
from app.models import User, Transaction
from datetime import date, datetime
from test_config import TestConfig


@pytest.fixture(scope='function')
def app():
    """Create and configure a test Flask application instance."""
    app = create_app(config_object=TestConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create a test CLI runner for the Flask application."""
    return app.test_cli_runner()


@pytest.fixture(scope='function')
def test_user(app):
    """Create a test user in the database."""
    user = User(
        username='testuser',
        email='test@example.com'
    )
    user.set_password('TestPassword123')
    
    with app.app_context():
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        user_id = user.id
        
    # Return a dict with user info (not the model instance)
    return {
        'id': user_id,
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'TestPassword123'
    }


@pytest.fixture(scope='function')
def second_user(app):
    """Create a second test user in the database."""
    user = User(
        username='seconduser',
        email='second@example.com'
    )
    user.set_password('SecondPassword123')
    
    with app.app_context():
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        user_id = user.id
        
    return {
        'id': user_id,
        'username': 'seconduser',
        'email': 'second@example.com',
        'password': 'SecondPassword123'
    }


@pytest.fixture(scope='function')
def auth_token(client, test_user):
    """Generate an authentication token for the test user."""
    response = client.post('/api/auth/login', json={
        'username': test_user['username'],
        'password': test_user['password']
    })
    
    assert response.status_code == 200
    data = response.get_json()
    return data['token']


@pytest.fixture(scope='function')
def auth_headers(auth_token):
    """Generate authorization headers with the test user's token."""
    return {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture(scope='function')
def test_transaction(app, test_user):
    """Create a test transaction in the database."""
    transaction = Transaction(
        transaction_date=date(2024, 1, 15),
        category='Food',
        subcategory='Groceries',
        description='Weekly shopping',
        amount=150.50,
        user_id=test_user['id']
    )
    
    with app.app_context():
        db.session.add(transaction)
        db.session.commit()
        db.session.refresh(transaction)
        transaction_id = transaction.id
        
    return {
        'id': transaction_id,
        'transaction_date': '2024-01-15',
        'category': 'Food',
        'subcategory': 'Groceries',
        'description': 'Weekly shopping',
        'amount': 150.50,
        'user_id': test_user['id']
    }


@pytest.fixture(scope='function')
def multiple_transactions(app, test_user):
    """Create multiple test transactions for the test user."""
    transactions = [
        Transaction(
            transaction_date=date(2024, 1, 15),
            category='Food',
            subcategory='Groceries',
            description='Weekly shopping',
            amount=150.50,
            user_id=test_user['id']
        ),
        Transaction(
            transaction_date=date(2024, 1, 20),
            category='Transport',
            subcategory='Gas',
            description='Fuel',
            amount=60.00,
            user_id=test_user['id']
        ),
        Transaction(
            transaction_date=date(2024, 2, 5),
            category='Food',
            subcategory='Restaurant',
            description='Dinner',
            amount=45.75,
            user_id=test_user['id']
        )
    ]
    
    with app.app_context():
        for transaction in transactions:
            db.session.add(transaction)
        db.session.commit()

