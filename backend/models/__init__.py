# ============================================================
# models/__init__.py — Makes 'models' a Python package
# ============================================================
# Importing all models here means SQLAlchemy's Base knows about
# all tables when we call Base.metadata.create_all(engine).
# If we don't import them here, tables might not be created!
# ============================================================

from models.user import User
from models.seller_profile import SellerProfile
from models.seller_document import SellerDocument
from models.property import Property, PropertyImage
from models.enquiry import Enquiry
from models.broker_settings import BrokerSettings
from models.saved_property import SavedProperty
from models.visit import Visit
from models.offer import Offer
from models.notification import Notification
from models.notification_preference import NotificationPreference
from models.otp_code import OTPCode
