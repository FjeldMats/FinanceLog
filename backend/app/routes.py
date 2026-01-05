import logging
from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from app.models import Transaction, User
from app import db
from app.auth_utils import token_required
from sqlalchemy import text
import pandas as pd
import numpy as np
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.holtwinters import ExponentialSmoothing
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
@token_required
def get_transactions(current_user):
    """Get all transactions for the current user or filter by year, month, and category."""
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    category = request.args.get('category')

    # Base query filtered by user
    query = Transaction.query.filter_by(user_id=current_user.id)

    if year and month and category:
        transactions = query.filter(
            db.extract('year', Transaction.transaction_date) == year,
            db.extract('month', Transaction.transaction_date) == month,
            Transaction.category == category
        ).all()
    else:
        transactions = query.all()

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
    """Get AI-based projections using Holt-Winters Exponential Smoothing."""
    try:
        # Get all transactions for this category
        transactions = Transaction.query.filter_by(category=category).all()

        if len(transactions) < 24:
            return jsonify({
                "error": "Insufficient data",
                "message": f"Need at least 24 transactions. Found {len(transactions)} transactions."
            }), 400

        # Prepare data
        data = []
        for tx in transactions:
            data.append({
                'date': tx.transaction_date,
                'amount': float(abs(tx.amount))  # Convert Decimal to float
            })

        # Create DataFrame and aggregate by month
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.groupby(df['date'].dt.to_period('M')).agg({'amount': 'sum'}).reset_index()
        df['date'] = df['date'].dt.to_timestamp()
        df = df.sort_values('date')

        # Check if we have enough monthly data
        if len(df) < 12:
            return jsonify({
                "error": "Insufficient monthly data",
                "message": f"Need at least 12 months of data. Found {len(df)} months."
            }), 400

        # Create time series and ensure it's float type
        ts = df.set_index('date')['amount'].astype(float)

        # Determine if current month is incomplete
        now = datetime.now()
        current_month_start = pd.Timestamp(year=now.year, month=now.month, day=1)
        last_data_month = ts.index[-1]

        # Check if the last data point is the current month (incomplete)
        is_current_month_incomplete = (
            last_data_month.year == now.year and
            last_data_month.month == now.month
        )

        # If current month is incomplete, exclude it from training data
        if is_current_month_incomplete:
            ts_for_training = ts.iloc[:-1]  # Exclude last (incomplete) month
            current_month_actual = float(ts.iloc[-1])  # Store the partial amount
        else:
            ts_for_training = ts
            current_month_actual = None

        # Fit Holt-Winters Exponential Smoothing model
        # seasonal_periods=12 for yearly seasonality
        model = ExponentialSmoothing(
            ts_for_training,
            seasonal_periods=12,
            trend='add',
            seasonal='add',
            initialization_method='estimated'
        )

        fitted_model = model.fit()

        # Forecast ahead
        # If current month is incomplete, we need 13 forecasts (current month + 12 future)
        # Otherwise, we need 12 forecasts
        forecast_steps = 13 if is_current_month_incomplete else 12
        forecast = fitted_model.forecast(steps=forecast_steps)

        # Calculate confidence intervals using residuals from training data
        residuals = fitted_model.resid
        std_error = np.std(residuals)
        confidence_multiplier = 1.28  # 80% confidence interval

        # Prepare response
        result = {
            'historical': [],
            'projected': [],
            'current_month_actual': None  # Actual spending so far this month
        }

        # Historical data - only include complete months (training data)
        for date, value in ts_for_training.items():
            result['historical'].append({
                'date': date.strftime('%Y-%m'),
                'value': float(value)
            })

        # Projected data with confidence intervals
        if is_current_month_incomplete:
            # First forecast is for current month (full month projection)
            # Store the actual partial spending
            result['current_month_actual'] = current_month_actual

            # Start projections from current month
            forecast_dates = pd.date_range(start=current_month_start, periods=13, freq='MS')
        else:
            # Start projections from next month
            forecast_dates = pd.date_range(start=ts.index[-1] + pd.DateOffset(months=1), periods=12, freq='MS')

        for date, value in zip(forecast_dates, forecast):
            result['projected'].append({
                'date': date.strftime('%Y-%m'),
                'value': float(value),
                'lower': float(max(0, value - confidence_multiplier * std_error)),
                'upper': float(value + confidence_multiplier * std_error)
            })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error generating projections for {category}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to generate projections: {str(e)}"}), 500
