from app import db

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
