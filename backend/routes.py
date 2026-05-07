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
            "block_index": a.block_index,
            "assignee": a.assignee
        }
        for a in all_appointments
    ])

def has_assignee_conflict(assignee, start_time, duration_minutes, exclude_id=None):
    """Check if the given assignee has a conflicting appointment at start_time."""
    q = Appointment.query.filter_by(assignee=assignee)
    if exclude_id:
        q = q.filter(Appointment.id != exclude_id)
    end_time = start_time + timedelta(minutes=duration_minutes)
    for appt in q.all():
        appt_end = appt.date + timedelta(minutes=appt.duration_minutes)
        if appt.date < end_time and appt_end > start_time:
            return True
    return False


def create_service_appointment(data):
    """Create appointments for a service with potentially multiple blocks"""
    try:
        service_code = data.get('service_code')
        if not service_code:
            return jsonify({"error": "service_code is required"}), 400
        
        service = current_app.services.get(service_code)
        
        if not service:
            return jsonify({"error": f"Service not found: {service_code}"}), 400
        
        if 'blocks' not in service:
            return jsonify({"error": f"Service {service_code} has no blocks defined"}), 400
        
        start_date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M')
        
        # delegated_blocks: list of service-block indices (0 = first service block, etc.) to assign to Chantal
        delegated_blocks = data.get('delegated_blocks', [])
        
        # Pre-check availability for both Marie and Chantal BEFORE creating any session objects
        check_time = start_date
        svc_idx = 0
        for block in service['blocks']:
            if block.get('type') == 'service':
                if svc_idx in delegated_blocks:
                    if has_assignee_conflict('chantal', check_time, block['duration']):
                        return jsonify({"error": "Chantal est déjà occupée sur ce créneau."}), 409
                else:
                    if has_assignee_conflict('marie', check_time, block['duration']):
                        return jsonify({"error": "Marie est déjà occupée sur ce créneau."}), 409
                svc_idx += 1
            check_time += timedelta(minutes=block['duration'])
        
        # Create group ID for multi-block services
        group_id = str(uuid.uuid4()) if len(service['blocks']) > 1 else None
        
        current_time = start_date
        appointments_created = []
        service_block_index = 0
        
        for block_index, block in enumerate(service['blocks']):
            # Only create appointments for service blocks, not pauses
            if block.get('type') == 'service':
                assignee = 'chantal' if service_block_index in delegated_blocks else 'marie'
                appointment = Appointment(
                    customer_id=data['customer_id'],
                    date=current_time,
                    duration_minutes=block['duration'],
                    service_code=service_code,
                    group_id=group_id,
                    block_index=block_index,
                    assignee=assignee
                )
                db.session.add(appointment)
                appointments_created.append(appointment)
                service_block_index += 1
            
            # Move to next block time (including pauses)
            current_time += timedelta(minutes=block['duration'])
        
        db.session.commit()
        return jsonify({
            "message": f"Service appointment created! ({len(appointments_created)} blocks)",
            "group_id": group_id
        }), 201
        
    except KeyError as e:
        db.session.rollback()
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error creating service appointment: {error_details}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@api_blueprint.route('/appointments/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404

    data = request.json
    
    # Only allow date changes, duration is fixed by the service
    if 'date' in data:
        appointment.date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M')
    
    if 'assignee' in data:
        new_assignee = data['assignee']
        if new_assignee not in ('marie', 'chantal'):
            return jsonify({"error": "Valeur assignee invalide."}), 400
        if has_assignee_conflict(new_assignee, appointment.date, appointment.duration_minutes, exclude_id=appointment.id):
            name = 'Chantal' if new_assignee == 'chantal' else 'Marie'
            return jsonify({"error": f"{name} est déjà occupée sur ce créneau."}), 409
        appointment.assignee = new_assignee
    
    db.session.commit()
    return jsonify({"message": "Appointment updated!"}), 200


@api_blueprint.route('/appointments/<int:appointment_id>/assignee-feasibility', methods=['GET'])
def assignee_feasibility(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
    marie_available = not has_assignee_conflict('marie', appointment.date, appointment.duration_minutes, exclude_id=appointment_id)
    chantal_available = not has_assignee_conflict('chantal', appointment.date, appointment.duration_minutes, exclude_id=appointment_id)
    return jsonify({"marie_available": marie_available, "chantal_available": chantal_available})


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

# 🔍 Conflict Check API (real-time, before creation)
@api_blueprint.route('/appointments/conflict-check', methods=['POST'])
def conflict_check():
    """Check conflicts for each block of a service before creation."""
    data = request.json
    service_code = data.get('service_code')
    date_str = data.get('date')
    delegated_blocks = data.get('delegated_blocks', [])

    if not service_code or not date_str:
        return jsonify({"error": "service_code and date are required"}), 400

    service = current_app.services.get(service_code)
    if not service:
        return jsonify({"error": f"Service not found: {service_code}"}), 400

    try:
        start_date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M')
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    results = []
    check_time = start_date
    svc_idx = 0

    for block_index, block in enumerate(service.get('blocks', [])):
        if block.get('type') == 'service':
            assignee = 'chantal' if svc_idx in delegated_blocks else 'marie'
            conflict = has_assignee_conflict(assignee, check_time, block['duration'])
            results.append({
                "block_index": block_index,
                "svc_idx": svc_idx,
                "assignee": assignee,
                "conflict": conflict,
                "conflict_with": ('Chantal' if assignee == 'chantal' else 'Marie') if conflict else None
            })
            svc_idx += 1
        check_time += timedelta(minutes=block['duration'])

    return jsonify(results)


# ️ Services API
@api_blueprint.route('/services', methods=['GET'])
def get_services():
    """Return all available services"""
    return jsonify(current_app.services)

