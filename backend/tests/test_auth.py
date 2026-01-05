"""
User Story Tests: User Authentication
Tests for login functionality and JWT token validation.
"""
import pytest
import jwt
from datetime import datetime, timedelta
from flask import current_app


class TestUserLogin:
    """Test cases for user login functionality."""

    def test_login_with_valid_credentials_returns_jwt_token(self, client, test_user):
        """
        User Story: As a user, I want to login with my username and password
        Test Case 1: Valid credentials return JWT token
        """
        response = client.post('/api/auth/login', json={
            'username': test_user['username'],
            'password': test_user['password']
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert 'user' in data
        assert data['message'] == 'Login successful'
        assert data['user']['username'] == test_user['username']
        
        # Verify token is valid JWT
        token = data['token']
        assert isinstance(token, str)
        assert len(token) > 0

    def test_login_with_invalid_username_returns_401(self, client, test_user):
        """
        User Story: As a user, I want to login with my username and password
        Test Case 2: Invalid username returns 401
        """
        response = client.post('/api/auth/login', json={
            'username': 'nonexistentuser',
            'password': test_user['password']
        })

        assert response.status_code == 401
        data = response.get_json()
        assert 'message' in data
        assert 'Invalid username or password' in data['message']

    def test_login_with_invalid_password_returns_401(self, client, test_user):
        """
        User Story: As a user, I want to login with my username and password
        Test Case 3: Invalid password returns 401
        """
        response = client.post('/api/auth/login', json={
            'username': test_user['username'],
            'password': 'WrongPassword123'
        })

        assert response.status_code == 401
        data = response.get_json()
        assert 'message' in data
        assert 'Invalid username or password' in data['message']

    def test_login_with_missing_credentials_returns_400(self, client):
        """
        User Story: As a user, I want to login with my username and password
        Test Case 4: Missing credentials return 400
        """
        # Missing password
        response = client.post('/api/auth/login', json={
            'username': 'testuser'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'Missing username or password' in data['message']

        # Missing username
        response = client.post('/api/auth/login', json={
            'password': 'TestPassword123'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'Missing username or password' in data['message']

        # Missing both
        response = client.post('/api/auth/login', json={})
        assert response.status_code == 400

    def test_login_token_contains_correct_user_id(self, client, test_user, app):
        """
        User Story: As a user, I want to login with my username and password
        Test Case 5: Token contains correct user_id
        """
        response = client.post('/api/auth/login', json={
            'username': test_user['username'],
            'password': test_user['password']
        })

        assert response.status_code == 200
        data = response.get_json()
        token = data['token']

        # Decode token and verify user_id
        with app.app_context():
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[current_app.config['JWT_ALGORITHM']]
            )
            assert payload['user_id'] == test_user['id']
            assert 'exp' in payload  # Expiration time
            assert 'iat' in payload  # Issued at time


class TestTokenValidation:
    """Test cases for JWT token validation."""

    def test_valid_token_allows_access_to_protected_endpoints(self, client, auth_headers):
        """
        User Story: As a user, I want my session to be validated with JWT tokens
        Test Case 1: Valid token allows access to protected endpoints
        """
        response = client.get('/api/auth/me', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['username'] == 'testuser'

    def test_expired_token_returns_401(self, client, test_user, app):
        """
        User Story: As a user, I want my session to be validated with JWT tokens
        Test Case 2: Expired token returns 401
        """
        # Generate an expired token
        with app.app_context():
            payload = {
                'user_id': test_user['id'],
                'exp': datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
                'iat': datetime.utcnow() - timedelta(hours=2)
            }
            expired_token = jwt.encode(
                payload,
                current_app.config['JWT_SECRET_KEY'],
                algorithm=current_app.config['JWT_ALGORITHM']
            )

        headers = {
            'Authorization': f'Bearer {expired_token}',
            'Content-Type': 'application/json'
        }

        response = client.get('/api/auth/me', headers=headers)
        assert response.status_code == 401
        data = response.get_json()
        assert 'Token is invalid or expired' in data['message']

    def test_invalid_token_returns_401(self, client):
        """
        User Story: As a user, I want my session to be validated with JWT tokens
        Test Case 3: Invalid token returns 401
        """
        headers = {
            'Authorization': 'Bearer invalid.token.here',
            'Content-Type': 'application/json'
        }

        response = client.get('/api/auth/me', headers=headers)
        assert response.status_code == 401
        data = response.get_json()
        assert 'Token is invalid or expired' in data['message']

    def test_missing_token_returns_401(self, client):
        """
        User Story: As a user, I want my session to be validated with JWT tokens
        Test Case 4: Missing token returns 401
        """
        # No Authorization header
        response = client.get('/api/auth/me')
        assert response.status_code == 401
        data = response.get_json()
        assert 'Token is missing' in data['message']

        # Empty Authorization header
        headers = {'Authorization': ''}
        response = client.get('/api/auth/me', headers=headers)
        assert response.status_code == 401

    def test_token_with_wrong_signature_returns_401(self, client, test_user, app):
        """
        User Story: As a user, I want my session to be validated with JWT tokens
        Test Case 5: Token with wrong signature returns 401
        """
        # Generate token with wrong secret key
        with app.app_context():
            payload = {
                'user_id': test_user['id'],
                'exp': datetime.utcnow() + timedelta(hours=1),
                'iat': datetime.utcnow()
            }
            wrong_token = jwt.encode(
                payload,
                'wrong-secret-key',  # Wrong secret
                algorithm=current_app.config['JWT_ALGORITHM']
            )

        headers = {
            'Authorization': f'Bearer {wrong_token}',
            'Content-Type': 'application/json'
        }

        response = client.get('/api/auth/me', headers=headers)
        assert response.status_code == 401
        data = response.get_json()
        assert 'Token is invalid or expired' in data['message']

