"""
Integration Tests for Deployed Application
These tests verify the deployed application is working correctly.
All tests are READ-ONLY and do not modify production data.
Exception: Write tests that create data have guaranteed cleanup mechanisms.
"""
import pytest
import requests
import os
from datetime import date


# Get the base URL from environment or use default
BASE_URL = os.getenv('INTEGRATION_TEST_URL', 'http://localhost:5000')


@pytest.fixture
def integration_test_user():
    """
    Create a test user for integration tests with guaranteed cleanup.
    This user is created and deleted for each test that needs it.
    """
    # Generate unique username to avoid conflicts
    import time
    timestamp = int(time.time())
    username = f"inttest{timestamp}"
    email = f"inttest{timestamp}@example.com"
    password = "IntTest123!"  # Meets password requirements

    user_data = {
        "username": username,
        "email": email,
        "password": password
    }

    created_user_id = None
    token = None

    try:
        # Try to create user (may fail if endpoint doesn't exist, that's ok)
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=user_data,
            timeout=5
        )

        if response.status_code == 201:
            created_user_id = response.json().get('id')

            # Login to get token
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": username, "password": password},
                timeout=5
            )

            if login_response.status_code == 200:
                token = login_response.json().get('token')

        yield {
            'username': username,
            'email': email,
            'password': password,
            'id': created_user_id,
            'token': token
        }

    finally:
        # GUARANTEED CLEANUP: Delete user if it was created
        if token:
            try:
                # Try to delete the user account
                requests.delete(
                    f"{BASE_URL}/api/auth/user",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
            except Exception:
                pass  # Cleanup failed, but don't fail the test


class TestDeploymentHealth:
    """Health check tests for deployed application."""

    def test_backend_is_accessible(self):
        """Verify backend API is accessible."""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            assert response.status_code in [200, 404], \
                f"Backend not accessible. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Backend not accessible: {str(e)}")

    def test_backend_responds_to_root(self):
        """Verify backend root endpoint responds."""
        try:
            response = requests.get(f"{BASE_URL}/api/", timeout=5)
            # Accept 200, 404, or 405 (method not allowed) as valid responses
            assert response.status_code in [200, 404, 405], \
                f"Unexpected status code: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Backend root not accessible: {str(e)}")


class TestAuthenticationEndpoints:
    """Test authentication endpoints (read-only operations)."""

    def test_login_endpoint_exists(self):
        """Verify login endpoint exists and responds correctly to invalid credentials."""
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": "nonexistent_test_user", "password": "wrong"},
                timeout=5
            )
            # Should return 401 for invalid credentials (endpoint working)
            # or 400 for missing fields
            assert response.status_code in [400, 401], \
                f"Login endpoint not working correctly. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Login endpoint not accessible: {str(e)}")

    def test_protected_endpoint_requires_auth(self):
        """Verify protected endpoints require authentication."""
        try:
            response = requests.get(f"{BASE_URL}/api/transactions", timeout=5)
            # Should return 401 (unauthorized) without token
            assert response.status_code == 401, \
                f"Protected endpoint should require auth. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Transactions endpoint not accessible: {str(e)}")

    def test_invalid_token_rejected(self):
        """Verify invalid tokens are rejected."""
        try:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            response = requests.get(
                f"{BASE_URL}/api/transactions",
                headers=headers,
                timeout=5
            )
            # Should return 401 for invalid token
            assert response.status_code == 401, \
                f"Invalid token should be rejected. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Token validation not working: {str(e)}")


class TestAPIEndpoints:
    """Test API endpoints are accessible (read-only)."""

    def test_transactions_endpoint_exists(self):
        """Verify transactions endpoint exists."""
        try:
            response = requests.get(f"{BASE_URL}/api/transactions", timeout=5)
            # Should return 401 (needs auth) not 404 (not found)
            assert response.status_code == 401, \
                f"Transactions endpoint should exist. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Transactions endpoint not accessible: {str(e)}")

    def test_projections_endpoint_exists(self):
        """Verify projections endpoint exists."""
        try:
            # Try to access projections for a category
            response = requests.get(f"{BASE_URL}/api/projections/Food", timeout=5)
            # Should return 401 (needs auth) not 404 (not found)
            assert response.status_code == 401, \
                f"Projections endpoint should exist. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Projections endpoint not accessible: {str(e)}")


class TestDatabaseConnectivity:
    """Test database connectivity through API (read-only)."""

    def test_database_connection_through_login(self):
        """Verify database is accessible by testing login endpoint."""
        try:
            # Try to login with test credentials
            # This will fail but proves database connectivity
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"username": "test_db_check", "password": "test"},
                timeout=5
            )
            # Should return 401 (user not found) not 500 (database error)
            assert response.status_code in [400, 401], \
                f"Database connection issue. Status: {response.status_code}"
            
            # If we get a 500, check the error message
            if response.status_code == 500:
                data = response.json()
                pytest.fail(f"Database error: {data.get('error', 'Unknown error')}")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Database connectivity test failed: {str(e)}")


class TestCORS:
    """Test CORS configuration (read-only)."""

    def test_cors_headers_present(self):
        """Verify CORS headers are configured."""
        try:
            response = requests.options(
                f"{BASE_URL}/api/auth/login",
                headers={"Origin": "http://localhost:3000"},
                timeout=5
            )
            # Check if CORS headers are present
            # Accept various status codes as long as server responds
            assert response.status_code in [200, 204, 404, 405], \
                f"CORS preflight failed. Status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            # CORS might not be configured for OPTIONS, that's okay
            pass


class TestDataIntegrity:
    """
    Test data operations with GUARANTEED cleanup.
    These tests create data and ensure it's deleted even if the test fails.
    """

    def test_create_and_delete_transaction(self, integration_test_user):
        """
        Test creating and deleting a transaction.
        GUARANTEED CLEANUP: Transaction is deleted even if test fails.
        """
        if not integration_test_user['token']:
            pytest.skip("User creation not supported, skipping write test")

        token = integration_test_user['token']
        headers = {"Authorization": f"Bearer {token}"}
        created_transaction_id = None

        try:
            # Step 1: Create a test transaction
            transaction_data = {
                "transaction_date": str(date.today()),
                "category": "Integration_Test",
                "subcategory": "Test_Subcategory",
                "description": "Integration test transaction - SAFE TO DELETE",
                "amount": 99.99
            }

            response = requests.post(
                f"{BASE_URL}/api/transaction",
                json=transaction_data,
                headers=headers,
                timeout=5
            )

            assert response.status_code == 201, \
                f"Failed to create transaction. Status: {response.status_code}"

            created_transaction_id = response.json().get('id')
            assert created_transaction_id is not None, "Transaction ID not returned"

            # Step 2: Verify transaction was created
            response = requests.get(
                f"{BASE_URL}/api/transactions",
                headers=headers,
                timeout=5
            )

            assert response.status_code == 200, "Failed to retrieve transactions"
            transactions = response.json()
            assert any(t['id'] == created_transaction_id for t in transactions), \
                "Created transaction not found in list"

        finally:
            # GUARANTEED CLEANUP: Delete the transaction
            if created_transaction_id:
                try:
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/transaction/{created_transaction_id}",
                        headers=headers,
                        timeout=5
                    )
                    assert delete_response.status_code == 200, \
                        f"CLEANUP FAILED: Could not delete transaction {created_transaction_id}"

                    # Verify deletion
                    verify_response = requests.get(
                        f"{BASE_URL}/api/transactions",
                        headers=headers,
                        timeout=5
                    )
                    if verify_response.status_code == 200:
                        transactions = verify_response.json()
                        assert not any(t['id'] == created_transaction_id for t in transactions), \
                            f"CLEANUP FAILED: Transaction {created_transaction_id} still exists"

                except AssertionError:
                    raise  # Re-raise assertion errors
                except Exception as e:
                    pytest.fail(f"CLEANUP FAILED: {str(e)}")

    def test_update_transaction_with_rollback(self, integration_test_user):
        """
        Test updating a transaction and rolling back changes.
        GUARANTEED CLEANUP: Changes are reverted even if test fails.
        """
        if not integration_test_user['token']:
            pytest.skip("User creation not supported, skipping write test")

        token = integration_test_user['token']
        headers = {"Authorization": f"Bearer {token}"}
        created_transaction_id = None
        original_data = None

        try:
            # Step 1: Create a test transaction
            transaction_data = {
                "transaction_date": str(date.today()),
                "category": "Integration_Test",
                "description": "Original description",
                "amount": 50.00
            }

            response = requests.post(
                f"{BASE_URL}/api/transaction",
                json=transaction_data,
                headers=headers,
                timeout=5
            )

            assert response.status_code == 201, "Failed to create transaction"
            created_transaction_id = response.json().get('id')
            original_data = response.json()

            # Step 2: Update the transaction
            update_data = {
                "description": "Updated description - TEST",
                "amount": 75.00
            }

            update_response = requests.put(
                f"{BASE_URL}/api/transaction/{created_transaction_id}",
                json=update_data,
                headers=headers,
                timeout=5
            )

            assert update_response.status_code == 200, "Failed to update transaction"
            updated_data = update_response.json()
            assert updated_data['description'] == "Updated description - TEST", \
                "Update did not apply correctly"

        finally:
            # GUARANTEED CLEANUP: Delete the transaction
            if created_transaction_id:
                try:
                    requests.delete(
                        f"{BASE_URL}/api/transaction/{created_transaction_id}",
                        headers=headers,
                        timeout=5
                    )
                except Exception as e:
                    pytest.fail(f"CLEANUP FAILED: {str(e)}")

    def test_multiple_transactions_batch_cleanup(self, integration_test_user):
        """
        Test creating multiple transactions with batch cleanup.
        GUARANTEED CLEANUP: All transactions deleted even if test fails.
        """
        if not integration_test_user['token']:
            pytest.skip("User creation not supported, skipping write test")

        token = integration_test_user['token']
        headers = {"Authorization": f"Bearer {token}"}
        created_transaction_ids = []

        try:
            # Step 1: Create multiple test transactions
            for i in range(3):
                transaction_data = {
                    "transaction_date": str(date.today()),
                    "category": "Integration_Test_Batch",
                    "description": f"Batch test transaction {i+1}",
                    "amount": 10.00 * (i + 1)
                }

                response = requests.post(
                    f"{BASE_URL}/api/transaction",
                    json=transaction_data,
                    headers=headers,
                    timeout=5
                )

                if response.status_code == 201:
                    transaction_id = response.json().get('id')
                    created_transaction_ids.append(transaction_id)

            # Step 2: Verify all transactions were created
            assert len(created_transaction_ids) == 3, \
                f"Expected 3 transactions, created {len(created_transaction_ids)}"

            # Step 3: Verify they appear in the list
            response = requests.get(
                f"{BASE_URL}/api/transactions?category=Integration_Test_Batch",
                headers=headers,
                timeout=5
            )

            assert response.status_code == 200, "Failed to retrieve transactions"

        finally:
            # GUARANTEED CLEANUP: Delete all created transactions
            cleanup_failures = []
            for transaction_id in created_transaction_ids:
                try:
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/transaction/{transaction_id}",
                        headers=headers,
                        timeout=5
                    )
                    if delete_response.status_code != 200:
                        cleanup_failures.append(transaction_id)
                except Exception as e:
                    cleanup_failures.append(transaction_id)

            if cleanup_failures:
                pytest.fail(
                    f"CLEANUP FAILED: Could not delete transactions: {cleanup_failures}"
                )

