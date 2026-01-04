from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS


db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    app.secret_key = "your_secret_key_here"  # Added secret key here

    # Apply CORS before registering any routes
    CORS(app,  resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    
    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    from app.routes import api
    from app.auth_routes import auth_bp
    app.register_blueprint(api, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    return app
