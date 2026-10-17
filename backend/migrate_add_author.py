
import sqlite3
from database import DATABASE

conn = sqlite3.connect(DATABASE)

try:
    columns = {
        row[1]
        for row in conn.execute("PRAGMA table_info(books)").fetchall()
    }

    if "author" not in columns:
        conn.execute(
            "ALTER TABLE books ADD COLUMN author TEXT NOT NULL DEFAULT ''"
        )
        conn.commit()
        print("SUCCESS: author column added to books.")
    else:
        print("INFO: author column already exists. No change needed.")

except Exception:
    conn.rollback()
    raise

finally:
    conn.close()
