from app import db
from app.models import Transaction, User

def init_db(app):
    with app.app_context():
        db.create_all()

        # Add a default admin user if not exists
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin') # type: ignore
            admin.set_password('password')  # Replace with a secure password
            db.session.add(admin)
            db.session.commit()
