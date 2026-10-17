import sqlite3
from werkzeug.security import generate_password_hash

DATABASE = "bookhaven.db"

conn = sqlite3.connect(DATABASE)

# Users
conn.execute("""
INSERT OR IGNORE INTO users (name, email, password, role)
VALUES (?, ?, ?, ?)
""", (
    "BookHaven Admin",
    "admin@bookhaven.com",
    generate_password_hash("Admin@123"),
    "admin"
))

conn.execute("""
INSERT OR IGNORE INTO users (name, email, password, role)
VALUES (?, ?, ?, ?)
""", (
    "BookHaven User",
    "user@bookhaven.com",
    generate_password_hash("User@123"),
    "user"
))

# Books
books = [
    ("The Silent Patient", "Thriller", "9781250301697", 4),
    ("Atomic Habits", "Self Help", "9780735211292", 5),
    ("The Alchemist", "Fiction", "9780062315007", 2),
    ("Ikigai", "Lifestyle", "9780143130727", 3),
    ("Clean Code", "Technology", "9780132350884", 2)
]

for book in books:
    conn.execute("""
    INSERT OR IGNORE INTO books (title, category, isbn, copies)
    VALUES (?, ?, ?, ?)
    """, book)

conn.commit()

print("Users and books seeded successfully!")

conn.close()