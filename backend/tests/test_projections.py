"""
User Story Tests: Financial Projections
Tests for AI-based spending projections.
"""
import pytest
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


class TestFinancialProjections:
    """Test cases for financial projections."""

    def test_projections_returns_only_user_data(self, client, auth_headers, test_user, second_user, app):
        """
        User Story: As a user, I want to see AI-based spending projections
        Test Case 1: Returns projections only for user's data
        """
        from app.models import Transaction
        from app import db
        
        # Create 24+ transactions for test_user in Food category
        with app.app_context():
            base_date = date(2022, 1, 15)
            for i in range(30):
                t = Transaction(
                    transaction_date=base_date + relativedelta(months=i),
                    category='Food',
                    amount=100.00 + (i * 5),
                    user_id=test_user['id']
                )
                db.session.add(t)
            
            # Create transactions for second_user (should not affect test_user's projections)
            for i in range(30):
                t = Transaction(
                    transaction_date=base_date + relativedelta(months=i),
                    category='Food',
                    amount=500.00,  # Much higher amounts
                    user_id=second_user['id']
                )
                db.session.add(t)
            
            db.session.commit()

        # Get projections for test_user
        response = client.get('/api/projections/Food', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'projected' in data
        # Projections should be based on test_user's data (around 100-250 range)
        # not second_user's data (500 range)
        projections = data['projected']
        assert len(projections) > 0
        # Check that projections are reasonable for test_user's spending pattern
        for proj in projections:
            assert 'date' in proj
            assert 'value' in proj
            # Projections should be in reasonable range for test_user (not 500+)
            assert proj['value'] < 400

    def test_projections_requires_minimum_24_transactions(self, client, auth_headers, test_user, app):
        """
        User Story: As a user, I want to see AI-based spending projections
        Test Case 2: Requires minimum 24 transactions
        """
        from app.models import Transaction
        from app import db
        
        # Create only 20 transactions (less than required 24)
        with app.app_context():
            base_date = date(2023, 1, 15)
            for i in range(20):
                t = Transaction(
                    transaction_date=base_date + relativedelta(months=i),
                    category='Transport',
                    amount=50.00,
                    user_id=test_user['id']
                )
                db.session.add(t)
            db.session.commit()

        response = client.get('/api/projections/Transport', headers=auth_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'Insufficient data' in data['error']
        assert '24 transactions' in data['message']

    def test_projections_returns_error_with_insufficient_data(self, client, auth_headers):
        """
        User Story: As a user, I want to see AI-based spending projections
        Test Case 3: Returns error with insufficient data
        """
        # Try to get projections for a category with no transactions
        response = client.get('/api/projections/Entertainment', headers=auth_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'Insufficient data' in data['error']

    def test_projections_include_future_months(self, client, auth_headers, test_user, app):
        """
        User Story: As a user, I want to see AI-based spending projections
        Test Case 4: Projections include future months
        """
        from app.models import Transaction
        from app import db
        
        # Create 30 transactions spanning 30 months
        with app.app_context():
            base_date = date(2022, 1, 15)
            for i in range(30):
                t = Transaction(
                    transaction_date=base_date + relativedelta(months=i),
                    category='Utilities',
                    amount=150.00,
                    user_id=test_user['id']
                )
                db.session.add(t)
            db.session.commit()

        response = client.get('/api/projections/Utilities', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'projected' in data
        projections = data['projected']

        # Verify projections include future months
        assert len(projections) > 0
        # Each projection should have a date and value
        for proj in projections:
            assert 'date' in proj
            assert 'value' in proj
            # Projected amount should be a positive number
            assert proj['value'] > 0

    def test_projections_cannot_access_other_users_data(self, client, test_user, second_user, app):
        """
        User Story: As a user, I want to see AI-based spending projections
        Test Case 5: Cannot access other users' projections
        """
        from app.models import Transaction
        from app import db
        
        # Create transactions only for second_user
        with app.app_context():
            base_date = date(2022, 1, 15)
            for i in range(30):
                t = Transaction(
                    transaction_date=base_date + relativedelta(months=i),
                    category='Shopping',
                    amount=200.00,
                    user_id=second_user['id']
                )
                db.session.add(t)
            db.session.commit()

        # Login as test_user and try to get projections
        response = client.post('/api/auth/login', json={
            'username': test_user['username'],
            'password': test_user['password']
        })
        token = response.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # test_user should not see second_user's data
        response = client.get('/api/projections/Shopping', headers=headers)
        
        # Should return error because test_user has no Shopping transactions
        assert response.status_code == 400
        data = response.get_json()
        assert 'Insufficient data' in data['error']

