import sqlite3

conn = sqlite3.connect("bookhaven.db")

tables = conn.execute(
    "SELECT name FROM sqlite_master WHERE type = ? AND name = ?",
    ("table", "ebooks")
).fetchall()

print("E-books table:", tables)

conn.close()