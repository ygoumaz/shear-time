from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(15), nullable=False)

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    group_id = db.Column(db.String(50), nullable=True)  # For linking multi-block services
    service_code = db.Column(db.String(20), nullable=True)  # Service identifier (CPH, DYE_BRUSH, etc.)
    block_index = db.Column(db.Integer, nullable=False, default=0)  # Position in service blocks
    customer = db.relationship('Customer', backref=db.backref('appointments', lazy=True))
