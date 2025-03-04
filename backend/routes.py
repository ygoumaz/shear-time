from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Customer, Appointment

api_blueprint = Blueprint('api', __name__)

# 🏠 Homepage
@api_blueprint.route('/')
def index():
    return jsonify({"message": "Welcome to the Barber Shop API!"})

# 📋 Customers API
@api_blueprint.route('/customers', methods=['GET', 'POST'])
def customers():
    if request.method == 'POST':
        data = request.json
        new_customer = Customer(name=data['name'], phone=data['phone'])
        db.session.add(new_customer)
        db.session.commit()
        return jsonify({"message": "Customer added!"}), 201
    all_customers = Customer.query.all()
    return jsonify([{"id": c.id, "name": c.name, "phone": c.phone} for c in all_customers])

@api_blueprint.route('/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    data = request.json
    if 'name' in data:
        customer.name = data['name']
    if 'phone' in data:
        customer.phone = data['phone']
    
    db.session.commit()
    return jsonify({"message": "Customer updated!"}), 200

# ❌ DELETE an appointment
@api_blueprint.route('/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    # Delete all associated appointments
    appointments = Appointment.query.filter_by(customer_id=customer_id).all()
    for appointment in appointments:
        db.session.delete(appointment)

    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "Customer deleted!"}), 200

# 📅 Appointments API
@api_blueprint.route('/appointments', methods=['GET', 'POST'])
def appointments():
    if request.method == 'POST':
        data = request.json
        new_appointment = Appointment(
            customer_id=data['customer_id'],
            date=datetime.strptime(data['date'], '%Y-%m-%dT%H:%M'),
            duration_minutes = data['duration_minutes']
        )
        db.session.add(new_appointment)
        db.session.commit()
        return jsonify({"message": "Appointment created!"}), 201
    all_appointments = Appointment.query.order_by(Appointment.date).all()
    return jsonify([
        {"id": a.id, "customer": a.customer.name, "date": a.date.isoformat(), "duration_minutes": a.duration_minutes}
        for a in all_appointments
    ])

@api_blueprint.route('/appointments/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404

    data = request.json
    appointment.date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M')
    appointment.duration_minutes = data['duration_minutes']
    
    db.session.commit()
    return jsonify({"message": "Appointment updated!"}), 200


# ❌ DELETE an appointment
@api_blueprint.route('/appointments/<int:appointment_id>', methods=['DELETE'])
def delete_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404

    db.session.delete(appointment)
    db.session.commit()
    return jsonify({"message": "Appointment deleted!"}), 200