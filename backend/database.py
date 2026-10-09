import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import URL

# Railway MySQL configuration
DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=os.getenv("MYSQLUSER", "root"),
    password=os.getenv("MYSQLPASSWORD", ""),
    host=os.getenv("MYSQLHOST", "localhost"),
    port=int(os.getenv("MYSQLPORT", "3306")),
    database=os.getenv("MYSQLDATABASE", "internproof"),
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    try:
        with engine.connect() as connection:
            print("Database connection successful!")
    except Exception as error:
        print("Database connection failed:", error)