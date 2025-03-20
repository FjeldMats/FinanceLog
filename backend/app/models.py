from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    transaction_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(255), nullable=False)
    subcategory = db.Column(db.String(255))
    description = db.Column(db.Text)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_date": self.transaction_date.isoformat(),
            "category": self.category,
            "subcategory": self.subcategory,
            "description": self.description,
            "amount": float(self.amount),
        }

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
