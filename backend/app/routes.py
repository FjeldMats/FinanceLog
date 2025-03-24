import logging
from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from app.models import Transaction, User
from app import db
from sqlalchemy import text

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

api = Blueprint('api', __name__)

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
    """Get all transactions or filter by year, month, and category."""
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    category = request.args.get('category')
    if year and month and category:
        transactions = Transaction.get_by_month_and_category(year, month, category)
    else:
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

@api.route('/transaction/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Update a transaction."""
    transaction = Transaction.query.get_or_404(transaction_id)
    data = request.get_json()

    try:
        if 'category' in data:
            transaction.category = data['category']
        if 'subcategory' in data:
            transaction.subcategory = data['subcategory']
        if 'description' in data:
            transaction.description = data['description']
        if 'amount' in data:
            transaction.amount = data['amount']
        if 'transaction_date' in data:
            transaction.transaction_date = data['transaction_date']

        db.session.commit()
        return jsonify(transaction.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update transaction: {str(e)}"}), 500
