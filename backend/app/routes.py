from flask import Blueprint, request, jsonify
from app.models import Transaction
from app import db

api = Blueprint('api', __name__)


@api.before_request
def disable_csrf():
    if request.endpoint.startswith('api.'):
        setattr(request, '_disable_csrf', True)

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
            transaction_date=data['transaction_date'],
            category=data['category'],
            subcategory=data.get('subcategory'),
            description=data.get('description'),
            amount=data['amount']
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
