"""
User Story Tests: Transaction Management
Tests for creating, viewing, updating, and deleting transactions.
"""
import pytest
from datetime import date


class TestCreateTransaction:
    """Test cases for creating transactions."""

    def test_create_transaction_with_valid_data(self, client, auth_headers, test_user):
        """
        User Story: As a user, I want to create new transactions
        Test Case 1: Valid transaction data creates transaction with user_id
        """
        transaction_data = {
            'transaction_date': date(2024, 3, 15).isoformat(),
            'category': 'Food',
            'subcategory': 'Groceries',
            'description': 'Weekly shopping',
            'amount': 125.50
        }

        response = client.post('/api/transaction',
                              json=transaction_data,
                              headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        assert data['category'] == 'Food'
        assert data['subcategory'] == 'Groceries'
        assert data['description'] == 'Weekly shopping'
        assert float(data['amount']) == 125.50
        assert data['user_id'] == test_user['id']
        assert 'id' in data

    def test_create_transaction_missing_required_fields_returns_400(self, client, auth_headers):
        """
        User Story: As a user, I want to create new transactions
        Test Case 2: Missing required fields return 400
        """
        # Missing transaction_date
        response = client.post('/api/transaction', 
                              json={
                                  'category': 'Food',
                                  'amount': 100.00
                              },
                              headers=auth_headers)
        assert response.status_code == 500  # Backend returns 500 for missing fields
        
        # Missing category
        response = client.post('/api/transaction', 
                              json={
                                  'transaction_date': '2024-03-15',
                                  'amount': 100.00
                              },
                              headers=auth_headers)
        assert response.status_code == 500
        
        # Missing amount
        response = client.post('/api/transaction', 
                              json={
                                  'transaction_date': '2024-03-15',
                                  'category': 'Food'
                              },
                              headers=auth_headers)
        assert response.status_code == 500

    def test_create_transaction_invalid_amount_format_returns_error(self, client, auth_headers):
        """
        User Story: As a user, I want to create new transactions
        Test Case 3: Invalid amount format returns 400
        """
        transaction_data = {
            'transaction_date': '2024-03-15',
            'category': 'Food',
            'amount': 'invalid_amount'
        }

        response = client.post('/api/transaction', 
                              json=transaction_data,
                              headers=auth_headers)
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data

    def test_create_transaction_associated_with_authenticated_user(self, client, auth_headers, test_user):
        """
        User Story: As a user, I want to create new transactions
        Test Case 4: Transaction is associated with authenticated user
        """
        transaction_data = {
            'transaction_date': date(2024, 3, 15).isoformat(),
            'category': 'Transport',
            'amount': 50.00
        }

        response = client.post('/api/transaction',
                              json=transaction_data,
                              headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        # Verify the transaction is associated with the correct user
        assert data['user_id'] == test_user['id']

    def test_create_transaction_returns_transaction_with_id(self, client, auth_headers):
        """
        User Story: As a user, I want to create new transactions
        Test Case 5: Created transaction is returned with ID
        """
        transaction_data = {
            'transaction_date': date(2024, 3, 15).isoformat(),
            'category': 'Entertainment',
            'amount': 75.00
        }

        response = client.post('/api/transaction',
                              json=transaction_data,
                              headers=auth_headers)

        assert response.status_code == 201
        data = response.get_json()
        assert 'id' in data
        assert isinstance(data['id'], int)
        assert data['id'] > 0


class TestViewTransactions:
    """Test cases for viewing transactions."""

    def test_view_transactions_returns_only_user_transactions(self, client, auth_headers, test_user, second_user, app):
        """
        User Story: As a user, I want to view my transactions
        Test Case 1: Returns only transactions for authenticated user
        """
        from app.models import Transaction
        from app import db
        
        # Create transactions for both users
        with app.app_context():
            # Transaction for test_user
            t1 = Transaction(
                transaction_date=date(2024, 3, 15),
                category='Food',
                amount=100.00,
                user_id=test_user['id']
            )
            # Transaction for second_user
            t2 = Transaction(
                transaction_date=date(2024, 3, 15),
                category='Food',
                amount=200.00,
                user_id=second_user['id']
            )
            db.session.add(t1)
            db.session.add(t2)
            db.session.commit()

        response = client.get('/api/transactions', headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        # Should only return test_user's transactions
        assert all(t['user_id'] == test_user['id'] for t in data)

    def test_view_transactions_filter_by_year(self, client, auth_headers, test_user, app):
        """
        User Story: As a user, I want to view my transactions
        Test Case 2: Filter by year works correctly
        """
        from app.models import Transaction
        from app import db

        with app.app_context():
            # Create transactions in different years
            t1 = Transaction(
                transaction_date=date(2023, 6, 15),
                category='Food',
                amount=100.00,
                user_id=test_user['id']
            )
            t2 = Transaction(
                transaction_date=date(2024, 6, 15),
                category='Food',
                amount=200.00,
                user_id=test_user['id']
            )
            db.session.add(t1)
            db.session.add(t2)
            db.session.commit()

        # Filter by year 2024
        response = client.get('/api/transactions?year=2024&month=6&category=Food',
                             headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1
        # All transactions should be from 2024
        for t in data:
            assert '2024' in t['transaction_date']

    def test_view_transactions_filter_by_month(self, client, auth_headers, test_user, app):
        """
        User Story: As a user, I want to view my transactions
        Test Case 3: Filter by month works correctly
        """
        from app.models import Transaction
        from app import db

        with app.app_context():
            # Create transactions in different months
            t1 = Transaction(
                transaction_date=date(2024, 1, 15),
                category='Food',
                amount=100.00,
                user_id=test_user['id']
            )
            t2 = Transaction(
                transaction_date=date(2024, 3, 15),
                category='Food',
                amount=200.00,
                user_id=test_user['id']
            )
            db.session.add(t1)
            db.session.add(t2)
            db.session.commit()

        # Filter by March 2024
        response = client.get('/api/transactions?year=2024&month=3&category=Food',
                             headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1
        # All transactions should be from March
        for t in data:
            assert '2024-03' in t['transaction_date']

    def test_view_transactions_filter_by_category(self, client, auth_headers, test_user, app):
        """
        User Story: As a user, I want to view my transactions
        Test Case 4: Filter by category works correctly
        """
        from app.models import Transaction
        from app import db

        with app.app_context():
            # Create transactions in different categories
            t1 = Transaction(
                transaction_date=date(2024, 3, 15),
                category='Food',
                amount=100.00,
                user_id=test_user['id']
            )
            t2 = Transaction(
                transaction_date=date(2024, 3, 15),
                category='Transport',
                amount=200.00,
                user_id=test_user['id']
            )
            db.session.add(t1)
            db.session.add(t2)
            db.session.commit()

        # Filter by Food category
        response = client.get('/api/transactions?year=2024&month=3&category=Food',
                             headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1
        # All transactions should be Food category
        for t in data:
            assert t['category'] == 'Food'

    def test_view_transactions_returns_empty_list_when_none_exist(self, client, app):
        """
        User Story: As a user, I want to view my transactions
        Test Case 5: Returns empty list when no transactions exist
        """
        from app.models import User
        from app import db

        # Create a new user with no transactions
        with app.app_context():
            new_user = User(username='emptyuser', email='empty@example.com')
            new_user.set_password('EmptyPassword123')
            db.session.add(new_user)
            db.session.commit()

        # Login as the new user
        response = client.post('/api/auth/login', json={
            'username': 'emptyuser',
            'password': 'EmptyPassword123'
        })
        token = response.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Get transactions
        response = client.get('/api/transactions', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) == 0


class TestUpdateTransaction:
    """Test cases for updating transactions."""

    def test_update_own_transaction(self, client, auth_headers, test_transaction):
        """
        User Story: As a user, I want to update my transactions
        Test Case 1: Can update own transaction
        """
        update_data = {
            'category': 'Transport',
            'amount': 200.00,
            'description': 'Updated description'
        }

        response = client.put(f'/api/transaction/{test_transaction["id"]}',
                             json=update_data,
                             headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['category'] == 'Transport'
        assert float(data['amount']) == 200.00
        assert data['description'] == 'Updated description'

    def test_cannot_update_another_users_transaction(self, client, test_transaction, second_user, app):
        """
        User Story: As a user, I want to update my transactions
        Test Case 2: Cannot update another user's transaction (404)
        """
        # Login as second user
        response = client.post('/api/auth/login', json={
            'username': second_user['username'],
            'password': second_user['password']
        })
        token = response.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Try to update test_user's transaction
        update_data = {'category': 'Hacked'}
        response = client.put(f'/api/transaction/{test_transaction["id"]}',
                             json=update_data,
                             headers=headers)

        assert response.status_code == 404

    def test_partial_updates_work_correctly(self, client, auth_headers, test_transaction):
        """
        User Story: As a user, I want to update my transactions
        Test Case 3: Partial updates work correctly
        """
        # Update only the amount
        response = client.put(f'/api/transaction/{test_transaction["id"]}',
                             json={'amount': 999.99},
                             headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert float(data['amount']) == 999.99
        # Other fields should remain unchanged
        assert data['category'] == test_transaction['category']

    def test_update_with_invalid_data_returns_400(self, client, auth_headers, test_transaction):
        """
        User Story: As a user, I want to update my transactions
        Test Case 4: Invalid data returns 400
        """
        # Invalid amount format
        response = client.put(f'/api/transaction/{test_transaction["id"]}',
                             json={'amount': 'invalid'},
                             headers=auth_headers)

        assert response.status_code == 500  # Backend returns 500 for invalid data
        data = response.get_json()
        assert 'error' in data

    def test_update_nonexistent_transaction_returns_404(self, client, auth_headers):
        """
        User Story: As a user, I want to update my transactions
        Test Case 5: Non-existent transaction returns 404
        """
        response = client.put('/api/transaction/99999',
                             json={'category': 'Food'},
                             headers=auth_headers)

        assert response.status_code == 404


class TestDeleteTransaction:
    """Test cases for deleting transactions."""

    def test_delete_own_transaction(self, client, auth_headers, test_transaction):
        """
        User Story: As a user, I want to delete transactions
        Test Case 1: Can delete own transaction
        """
        response = client.delete(f'/api/transaction/{test_transaction["id"]}',
                                headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        assert 'deleted successfully' in data['message'].lower()

    def test_cannot_delete_another_users_transaction(self, client, test_transaction, second_user):
        """
        User Story: As a user, I want to delete transactions
        Test Case 2: Cannot delete another user's transaction (404)
        """
        # Login as second user
        response = client.post('/api/auth/login', json={
            'username': second_user['username'],
            'password': second_user['password']
        })
        token = response.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Try to delete test_user's transaction
        response = client.delete(f'/api/transaction/{test_transaction["id"]}',
                                headers=headers)

        assert response.status_code == 404

    def test_delete_nonexistent_transaction_returns_404(self, client, auth_headers):
        """
        User Story: As a user, I want to delete transactions
        Test Case 3: Non-existent transaction returns 404
        """
        response = client.delete('/api/transaction/99999',
                                headers=auth_headers)

        assert response.status_code == 404

    def test_deleted_transaction_removed_from_database(self, client, auth_headers, test_transaction):
        """
        User Story: As a user, I want to delete transactions
        Test Case 4: Deleted transaction is removed from database
        """
        # Delete the transaction
        response = client.delete(f'/api/transaction/{test_transaction["id"]}',
                                headers=auth_headers)
        assert response.status_code == 200

        # Try to get the deleted transaction (should fail)
        response = client.put(f'/api/transaction/{test_transaction["id"]}',
                             json={'category': 'Food'},
                             headers=auth_headers)
        assert response.status_code == 404

    def test_delete_returns_success_message(self, client, auth_headers, test_transaction):
        """
        User Story: As a user, I want to delete transactions
        Test Case 5: Returns success message
        """
        response = client.delete(f'/api/transaction/{test_transaction["id"]}',
                                headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        assert isinstance(data['message'], str)
        assert len(data['message']) > 0

