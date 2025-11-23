from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from models import db, Customer, Appointment
import uuid

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
        
        # Handle service-based appointments
        if 'service_code' in data:
            return create_service_appointment(data)
        
        # Handle legacy duration-based appointments
        new_appointment = Appointment(
            customer_id=data['customer_id'],
            date=datetime.strptime(data['date'], '%Y-%m-%dT%H:%M'),
            duration_minutes=data['duration_minutes']
        )
        db.session.add(new_appointment)
        db.session.commit()
        return jsonify({"message": "Appointment created!"}), 201
        
    all_appointments = Appointment.query.order_by(Appointment.date).all()
    return jsonify([
        {
            "id": a.id, 
            "customer": a.customer.name, 
            "date": a.date.isoformat(), 
            "duration_minutes": a.duration_minutes,
            "service_code": a.service_code,
            "group_id": a.group_id,
            "block_index": a.block_index
        }
        for a in all_appointments
    ])

def create_service_appointment(data):
    """Create appointments for a service with potentially multiple blocks"""
    service_code = data['service_code']
    service = current_app.services.get(service_code)
    
    if not service:
        return jsonify({"error": "Service not found"}), 400
    
    start_date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M')
    
    # Check if service is available
    if not is_service_available(service, start_date):
        return jsonify({"error": "Service not available at this time"}), 400
    
    # Create group ID for multi-block services
    group_id = str(uuid.uuid4()) if len(service['blocks']) > 1 else None
    
    current_time = start_date
    appointments_created = []
    
    try:
        for block_index, block in enumerate(service['blocks']):
            # Only create appointments for service blocks, not pauses
            if block['type'] == 'service':
                appointment = Appointment(
                    customer_id=data['customer_id'],
                    date=current_time,
                    duration_minutes=block['duration'],
                    service_code=service_code,
                    group_id=group_id,
                    block_index=block_index
                )
                db.session.add(appointment)
                appointments_created.append(appointment)
            
            # Move to next block time (including pauses)
            current_time += timedelta(minutes=block['duration'])
        
        db.session.commit()
        return jsonify({
            "message": f"Service appointment created! ({len(appointments_created)} blocks)",
            "group_id": group_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

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

    # If appointment has a group_id, delete all appointments in the group
    if appointment.group_id:
        group_appointments = Appointment.query.filter_by(group_id=appointment.group_id).all()
        for group_appointment in group_appointments:
            db.session.delete(group_appointment)
    else:
        db.session.delete(appointment)
    
    db.session.commit()
    return jsonify({"message": "Appointment deleted!"}), 200

# 🛠️ Services API
@api_blueprint.route('/services', methods=['GET'])
def get_services():
    """Return all available services"""
    return jsonify(current_app.services)

@api_blueprint.route('/services/available', methods=['POST'])
def check_service_availability():
    """Check which services are available at a given date/time"""
    data = request.json
    # Handle both formats: with and without seconds
    date_str = data['date']
    try:
        requested_date = datetime.fromisoformat(date_str)
    except ValueError:
        # Fallback to manual parsing if fromisoformat fails
        requested_date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M')
    
    available_services = {}
    
    for service_code, service in current_app.services.items():
        if is_service_available(service, requested_date):
            available_services[service_code] = service
    
    return jsonify(available_services)

def is_service_available(service, start_time):
    """Check if a service can fit at the given start time"""
    current_time = start_time
    
    for block in service['blocks']:
        duration_minutes = block['duration']
        end_time = current_time + timedelta(minutes=duration_minutes)
        
        # For service blocks, check for conflicts
        if block['type'] == 'service':
            # Get all appointments and check for time conflicts in Python
            # This is more reliable across different database backends (SQLite, PostgreSQL, etc.)
            all_appointments = Appointment.query.all()
            
            for appt in all_appointments:
                appt_end_time = appt.date + timedelta(minutes=appt.duration_minutes)
                # Check if appointments overlap
                if appt.date < end_time and appt_end_time > current_time:
                    return False
        
        current_time = end_time
    
    return True
