
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "bookhaven.db")
SCHEMA_FILE = os.path.join(BASE_DIR, "schema.sql")

with open(SCHEMA_FILE, "r", encoding="utf-8") as file:
    schema = file.read()

conn = sqlite3.connect(DATABASE)

try:
    conn.executescript(schema)
    conn.commit()
finally:
    conn.close()

print("BookHaven database initialized successfully!")
