"""
Basic tests to verify pytest setup is working correctly.
"""
import pytest
from app import db
from app.models import User, Transaction


def test_app_exists(app):
    """Test that the Flask app is created successfully."""
    assert app is not None
    assert app.config['TESTING'] is True


def test_app_is_testing(app):
    """Test that the app is in testing mode."""
    assert app.config['TESTING'] is True
    assert 'sqlite' in app.config['SQLALCHEMY_DATABASE_URI']


def test_client_exists(client):
    """Test that the test client is created successfully."""
    assert client is not None


def test_database_is_empty(app):
    """Test that the database starts empty for each test."""
    with app.app_context():
        users = User.query.all()
        transactions = Transaction.query.all()
        assert len(users) == 0
        assert len(transactions) == 0


def test_test_user_fixture(app, test_user):
    """Test that the test_user fixture creates a user correctly."""
    assert test_user is not None
    assert test_user['username'] == 'testuser'
    assert test_user['email'] == 'test@example.com'
    
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        assert user is not None
        assert user.check_password('TestPassword123') is True


def test_auth_token_fixture(auth_token):
    """Test that the auth_token fixture generates a valid token."""
    assert auth_token is not None
    assert isinstance(auth_token, str)
    assert len(auth_token) > 0


def test_auth_headers_fixture(auth_headers):
    """Test that the auth_headers fixture generates valid headers."""
    assert auth_headers is not None
    assert 'Authorization' in auth_headers
    assert auth_headers['Authorization'].startswith('Bearer ')
    assert 'Content-Type' in auth_headers


def test_test_transaction_fixture(app, test_transaction, test_user):
    """Test that the test_transaction fixture creates a transaction correctly."""
    assert test_transaction is not None
    assert test_transaction['category'] == 'Food'
    assert test_transaction['amount'] == 150.50
    assert test_transaction['user_id'] == test_user['id']
    
    with app.app_context():
        transaction = Transaction.query.get(test_transaction['id'])
        assert transaction is not None
        assert transaction.category == 'Food'


def test_multiple_transactions_fixture(app, multiple_transactions, test_user):
    """Test that the multiple_transactions fixture creates multiple transactions."""
    with app.app_context():
        transactions = Transaction.query.filter_by(user_id=test_user['id']).all()
        assert len(transactions) == 3
        
        categories = [t.category for t in transactions]
        assert 'Food' in categories
        assert 'Transport' in categories

