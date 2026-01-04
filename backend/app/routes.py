import logging
from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from app.models import Transaction, User
from app import db
from sqlalchemy import text
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

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

@api.route('/projections/<category>', methods=['GET'])
def get_projections(category):
    """Get Prophet-based projections for a specific category."""
    try:
        # Get all transactions for this category
        transactions = Transaction.query.filter_by(category=category).all()

        if len(transactions) < 24:
            return jsonify({
                "error": "Insufficient data",
                "message": f"Need at least 24 months of data. Found {len(transactions)} transactions."
            }), 400

        # Prepare data for Prophet
        data = []
        for tx in transactions:
            data.append({
                'ds': tx.transaction_date,
                'y': abs(tx.amount)
            })

        # Create DataFrame and aggregate by month
        df = pd.DataFrame(data)
        df['ds'] = pd.to_datetime(df['ds'])
        df = df.groupby(df['ds'].dt.to_period('M')).agg({'y': 'sum'}).reset_index()
        df['ds'] = df['ds'].dt.to_timestamp()

        # Check if we have enough monthly data
        if len(df) < 12:
            return jsonify({
                "error": "Insufficient monthly data",
                "message": f"Need at least 12 months of data. Found {len(df)} months."
            }), 400

        # Initialize and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.8,  # 80% confidence interval
            changepoint_prior_scale=0.05  # Less sensitive to trend changes
        )

        model.fit(df)

        # Create future dataframe for 12 months ahead
        future = model.make_future_dataframe(periods=12, freq='MS')
        forecast = model.predict(future)

        # Prepare response with historical and projected data
        result = {
            'historical': [],
            'projected': [],
            'trend': [],
            'seasonality': []
        }

        # Historical data (actual values)
        for idx, row in df.iterrows():
            result['historical'].append({
                'date': row['ds'].strftime('%Y-%m'),
                'value': float(row['y'])
            })

        # Projected data (future predictions with confidence intervals)
        future_start = df['ds'].max()
        for idx, row in forecast.iterrows():
            date = pd.to_datetime(row['ds'])
            if date > future_start:
                result['projected'].append({
                    'date': date.strftime('%Y-%m'),
                    'value': float(row['yhat']),
                    'lower': float(row['yhat_lower']),
                    'upper': float(row['yhat_upper'])
                })

        # Trend component (shows overall direction)
        for idx, row in forecast.iterrows():
            date = pd.to_datetime(row['ds'])
            result['trend'].append({
                'date': date.strftime('%Y-%m'),
                'value': float(row['trend'])
            })

        # Yearly seasonality component (shows seasonal patterns)
        for idx, row in forecast.iterrows():
            date = pd.to_datetime(row['ds'])
            if 'yearly' in row:
                result['seasonality'].append({
                    'date': date.strftime('%Y-%m'),
                    'value': float(row['yearly'])
                })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error generating projections for {category}: {str(e)}")
        return jsonify({"error": f"Failed to generate projections: {str(e)}"}), 500
