import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///barber.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,  # Recycle connections after 30 minutes
        "pool_size": 10,        # Number of connections in the pool
        "max_overflow": 5       # Extra connections beyond pool_size
    }
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'  # Default to False in production

config = Config()