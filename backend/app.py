from flask import Flask
from flask_cors import CORS
from models import db
from config import Config
from routes import api_blueprint

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    with app.app_context():
        db.create_all()  # Ensures tables exist

    CORS(app)  # Enable CORS for all routes

    app.register_blueprint(api_blueprint)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)
