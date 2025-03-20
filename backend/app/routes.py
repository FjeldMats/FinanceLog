import logging
from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from app.models import Transaction, User
from app import db
from sqlalchemy import text

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

api = Blueprint('api', __name__)

# Set a secret key for session management
api.secret_key = "your_secret_key_here"

@api.before_request
def disable_csrf():
    if request.endpoint.startswith('api.'): # type: ignore
        setattr(request, '_disable_csrf', True)

@api.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    # ...you can add any additional CORS headers if needed...
    return response

@api.route('/transactions', methods=['GET'])
def get_transactions():
    """Get all transactions."""
    transactions = Transaction.query.all()
    return jsonify([t.to_dict() for t in transactions])

@api.route('/transaction', methods=['POST'])
def add_transaction():
    """Add a new transaction."""
    data = request.get_json()

    # Debugging: Print received data
    print("Received Data:", data)

    if not data:
        return jsonify({"error": "No data received"}), 400

    try:
        transaction = Transaction(
            transaction_date=data['transaction_date'], # type: ignore
            category=data['category'], # type: ignore
            subcategory=data.get('subcategory'), # type: ignore
            description=data.get('description'), # type: ignore
            amount=data['amount'] # type: ignore
        )

        db.session.add(transaction)
        db.session.commit()

        # Debugging: Check if it was committed
        print("Transaction Added:", transaction.to_dict())

        return jsonify(transaction.to_dict()), 201
    except Exception as e:
        db.session.rollback()  # Rollback in case of error
        print("Error adding transaction:", str(e))
        return jsonify({"error": "Failed to add transaction"}), 500


@api.route('/transaction/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a transaction."""
    transaction = Transaction.query.get_or_404(transaction_id)
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction deleted successfully"}), 200

@api.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*")
def login():
    """Authenticate user."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user:
        query = text("SELECT crypt(:pass, :hash) = :hash AS valid")
        result = db.session.execute(query, {"pass": password, "hash": user.password_hash}).fetchone()
        logger.debug("User hash: %s", user.password_hash)
        logger.debug("Crypt check result: %s", result)
        if result and result[0]:
            session['user_id'] = user.id  # Store user ID in session
            return jsonify({"message": "Login successful"}), 200

    return jsonify({"error": "Invalid username or password"}), 401

@api.route('/logout', methods=['POST'])
def logout():
    """Log out the user."""
    session.pop('user_id', None)  # Remove user ID from session
    return jsonify({"message": "Logged out successfully"}), 200

@api.route('/session', methods=['GET'])
def check_session():
    """Check if the user is logged in."""
    if 'user_id' in session:
        return jsonify({"logged_in": True}), 200
    return jsonify({"logged_in": False}), 200