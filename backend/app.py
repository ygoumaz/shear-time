from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config
from models import db


app = Flask(__name__)
app.config.from_object(Config)
CORS(app)  # Allow React frontend to call API

db.init_app(app)

# Register API routes
from routes import api_blueprint
app.register_blueprint(api_blueprint)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
