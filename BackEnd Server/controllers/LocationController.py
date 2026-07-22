from flask import Blueprint, request
import json
from models.Location import Location, RecordNotFoundException
from utils import ok, handle_errors

# Exported to server.py
location_bp = Blueprint('location_bp', __name__)

# Get ALL (/locations)
@location_bp.route('/locations', methods=['GET'])
@handle_errors
def get_locations():
    return ok([json.loads(l.to_json()) for l in Location.get_all()])

# GET /locations/id
# (fixed: previously built Location([]) and ignored the id, so it never
# loaded the requested record)
@location_bp.route('/locations/<int:id>', methods=['GET'])
@handle_errors
def get_location_by_id(id):
    l = Location([id])
    return ok(json.loads(l.to_json()))

# POST
@location_bp.route('/locations', methods=['POST'])
@handle_errors
def add():
    data = request.get_json()
    l = Location([])
    l.name = data.get('name')
    l.description = data.get('description')
    l.address = data.get('address')
    l.lat = data.get('lat')
    l.lng = data.get('lng')
    l.userId = data.get('userId')
    # Send to add
    l.add()

    return ok(message="Location added successfully.")
