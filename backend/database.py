from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import URL


# ==================================================
# MySQL Database Configuration
# ==================================================

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username="root",
    password="Jay@8327",
    host="localhost",
    port=3306,
    database="internproof"
)


# ==================================================
# Create Database Engine
# ==================================================

engine = create_engine(
    DATABASE_URL,
    echo=True
)


# ==================================================
# Create Session
# ==================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ==================================================
# Create Base
# ==================================================

Base = declarative_base()


# ==================================================
# Database Dependency
# ==================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ==================================================
# Test Database Connection
# ==================================================

if __name__ == "__main__":

    try:
        with engine.connect() as connection:
            print("Connected to database:", connection.engine.url.database)

    except Exception as error:
        print("Database connection failed:")
        print(error)