# ============================================================
# models/__init__.py — Makes 'models' a Python package
# ============================================================
# Importing all models here means SQLAlchemy's Base knows about
# all tables when we call Base.metadata.create_all(engine).
# If we don't import them here, tables might not be created!
# ============================================================

from models.user import User
from models.property import Property, PropertyImage
from models.enquiry import Enquiry
from models.broker_settings import BrokerSettings
