from database import SessionLocal
from models import User
from pwdlib import PasswordHash


# Create database session
db = SessionLocal()

# Password hashing
password_hash = PasswordHash.recommended()


# -----------------------------------------
# Admin details
# -----------------------------------------

full_name = input("Enter admin name: ")
email = input("Enter admin email: ")
password = input("Enter admin password: ")


# -----------------------------------------
# Check if email already exists
# -----------------------------------------

existing_user = (
    db.query(User)
    .filter(User.email == email)
    .first()
)

if existing_user:
    print("This email is already registered.")
    db.close()
    exit()


# -----------------------------------------
# Hash password
# -----------------------------------------

hashed_password = password_hash.hash(password)


# -----------------------------------------
# Create admin
# -----------------------------------------

admin_user = User(
    full_name=full_name,
    email=email,
    password_hash=hashed_password,
    role="admin"
)


# -----------------------------------------
# Save to database
# -----------------------------------------

db.add(admin_user)
db.commit()
db.refresh(admin_user)


print()
print("====================================")
print("Admin account created successfully!")
print("====================================")
print("Admin ID:", admin_user.id)
print("Name:", admin_user.full_name)
print("Email:", admin_user.email)
print("Role:", admin_user.role)


db.close()