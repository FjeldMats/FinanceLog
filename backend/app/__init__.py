from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS


db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # Apply CORS before registering any routes
    CORS(app,  resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    
    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    from app.routes import api
    app.register_blueprint(api, url_prefix='/api')

    return app
