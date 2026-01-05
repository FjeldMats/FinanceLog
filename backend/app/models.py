from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import extract  # added import

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    transaction_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(255), nullable=False)
    subcategory = db.Column(db.String(255))
    description = db.Column(db.Text)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Relationship to User
    user = db.relationship('User', backref='transactions')

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_date": self.transaction_date.isoformat(),
            "category": self.category,
            "subcategory": self.subcategory,
            "description": self.description,
            "amount": float(self.amount),
            "user_id": self.user_id,
        }

    @classmethod
    def get_by_month_and_category(cls, year, month, category):
        return cls.query.filter(
            extract('year', cls.transaction_date) == year,
            extract('month', cls.transaction_date) == month,
            cls.category == category
        ).all()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email
        }
