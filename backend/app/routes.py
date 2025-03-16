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
    transaction = Transaction(
        transaction_date=data['transaction_date'],
        category=data['category'],
        subcategory=data.get('subcategory'),
        description=data.get('description'),
        amount=data['amount']
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify(transaction.to_dict()), 201

@api.route('/transaction/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Delete a transaction."""
    transaction = Transaction.query.get_or_404(transaction_id)
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction deleted successfully"}), 200
