from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

password = "Password" 
password_enc = quote_plus(password)
SQL_DB_URL = f"postgresql://postgres:{password_enc}@localhost:5432/telegramMiniapps?client_encoding=utf8"

engine = create_engine(SQL_DB_URL)
session_local = sessionmaker(autoflush=False, autocommit=False, bind=engine)
Base = declarative_base()