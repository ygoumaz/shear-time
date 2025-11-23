from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models import db
from config import Config
from routes import api_blueprint
import json
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Load services configuration
    services_path = os.path.join(os.path.dirname(__file__), 'services.json')
    with open(services_path, 'r', encoding='utf-8') as f:
        app.services = json.load(f)

    db.init_app(app)
    migrate = Migrate(app, db)

    CORS(app)  # Enable CORS for all routes

    app.register_blueprint(api_blueprint)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)
