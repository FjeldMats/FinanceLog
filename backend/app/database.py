from app import db
from app.models import Transaction

def init_db(app):
    with app.app_context():
        db.create_all()
