import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

# Association table for User-Permission relationship (Many-to-Many)
user_permissions = Table(
    "user_permissions",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_name", String, ForeignKey("permissions.name", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Many-to-many relationship to permissions
    permissions = relationship("Permission", secondary=user_permissions, back_populates="users")
    hierarchy_permissions = relationship("UserHierarchyPermission", back_populates="user", cascade="all, delete-orphan")

class Permission(Base):
    __tablename__ = "permissions"

    name = Column(String, primary_key=True, index=True, nullable=False) # e.g. 'view_alerts', 'view_dashboard'
    description = Column(String, nullable=True)

    users = relationship("User", secondary=user_permissions, back_populates="permissions")

class UserHierarchyPermission(Base):
    __tablename__ = "user_hierarchy_permissions"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="hierarchy_permissions")

