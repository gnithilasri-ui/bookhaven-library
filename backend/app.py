
import os
import sqlite3

from flask import Flask, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from database import get_db_connection
from functools import wraps
from datetime import datetime, timezone
from flask import jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app = Flask(__name__)
# Use an environment variable for production deployments.
app.config["SECRET_KEY"] = os.environ.get(
    "BOOKHAVEN_SECRET_KEY",
    "dev-only-change-this-secret-before-deployment"
)

TOKEN_MAX_AGE = 60 * 60 * 8  # 8 hours

token_serializer = URLSafeTimedSerializer(
    app.config["SECRET_KEY"],
    salt="bookhaven-auth-v1"
)
CORS(app)

# E-book PDF upload settings
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"pdf"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20 MB


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )
def create_auth_token(user_id):
    return token_serializer.dumps({"user_id": user_id})


def require_auth(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        parts = header.split(" ", 1)

        if len(parts) != 2 or parts[0].lower() != "bearer":
            return {"message": "Please sign in first."}, 401

        try:
            payload = token_serializer.loads(
                parts[1],
                max_age=TOKEN_MAX_AGE
            )
        except (BadSignature, SignatureExpired):
            return {"message": "Session expired. Please sign in again."}, 401

        conn = get_db_connection()
        try:
            user = conn.execute(
                "SELECT id, name, email, role FROM users WHERE id = ?",
                (payload.get("user_id"),)
            ).fetchone()
        finally:
            conn.close()

        if user is None:
            return {"message": "Account no longer exists."}, 401

        request.current_user = dict(user)
        return handler(*args, **kwargs)

    return wrapper


def require_admin(handler):
    @wraps(handler)
    @require_auth
    def wrapper(*args, **kwargs):
        if request.current_user["role"].lower() != "admin":
            return {"message": "Admin access required."}, 403
        return handler(*args, **kwargs)

    return wrapper

# ---------------- HOME ----------------

@app.route("/")
def home():
    return {"message": "BookHaven Backend is running!"}


# ---------------- DATABASE TEST ----------------

@app.route("/test-db")
def test_db():
    conn = get_db_connection()
    conn.close()
    return {"message": "Database connection works!"}


# ---------------- GET BOOKS ----------------

@app.route("/api/books", methods=["GET"])
def get_books():
    conn = get_db_connection()
    try:
        books = conn.execute("SELECT * FROM books").fetchall()
        return [dict(book) for book in books]
    finally:
        conn.close()


# ---------------- ADD BOOK ----------------

@app.route("/api/books", methods=["POST"])
@require_admin
def add_book():
    data = request.get_json(silent=True) or {}

    title = str(data.get("title", "")).strip()
    author = str(data.get("author", "")).strip()
    category = str(data.get("category", "")).strip()
    isbn = str(data.get("isbn", "")).strip() or None

    try:
        copies = int(data.get("copies", 1))
    except (TypeError, ValueError):
        return {"message": "Copies must be a valid integer."}, 400

    if not title or not category:
        return {"message": "Title and category are required."}, 400

    if copies < 1:
        return {"message": "Copies must be at least 1."}, 400

    conn = get_db_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO books (title, author, category, isbn, copies)
            VALUES (?, ?, ?, ?, ?)
            """,
            (title, author, category, isbn, copies)
        )
        conn.commit()

        return {
            "message": "Book added successfully.",
            "book": {
                "id": cursor.lastrowid,
                "title": title,
                "author": author,
                "category": category,
                "isbn": isbn,
                "copies": copies
            }
        }, 201

    except sqlite3.IntegrityError:
        conn.rollback()
        return {
            "message": "A book with this ISBN may already exist."
        }, 409

    finally:
        conn.close()

    # ---------------- REGISTER ----------------

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    confirm_password = str(data.get("confirmPassword", ""))

    if not name or not email or not password:
        return {"message": "Name, email and password are required."}, 400

    if len(name) > 100 or len(email) > 254:
        return {"message": "Name or email is too long."}, 400

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        return {"message": "Enter a valid email address."}, 400

    if len(password) < 8:
        return {"message": "Password must contain at least 8 characters."}, 400

    if password != confirm_password:
        return {"message": "Passwords do not match."}, 400

    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE LOWER(email) = ?",
            (email,)
        ).fetchone()

        if existing:
            return {"message": "An account with this email already exists."}, 409

        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, 'user')
            """,
            (name, email, generate_password_hash(password))
        )
        conn.commit()

        user_id = cursor.lastrowid

        return {
            "message": "Account created successfully.",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": "user"
            }
        }, 201

    finally:
        conn.close()


# ---------------- LOGIN ----------------

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = str(data.get("role", "")).strip().lower()

    if not email or not password or role not in ("user", "admin"):
        return {"message": "Email, password and valid role are required."}, 400

    conn = get_db_connection()
    try:
        user = conn.execute(
            """
            SELECT id, name, email, password, role
            FROM users
            WHERE LOWER(email) = ?
            """,
            (email,)
        ).fetchone()

        if user is None or user["role"].lower() != role:
            return {"message": "Invalid email, password or role."}, 401

        stored_password = str(user["password"])

        if stored_password.startswith(("scrypt:", "pbkdf2:")):
            valid = check_password_hash(stored_password, password)
        else:
            # Legacy plaintext accounts: upgrade the password after login.
            valid = stored_password == password
            if valid:
                conn.execute(
                    "UPDATE users SET password = ? WHERE id = ?",
                    (generate_password_hash(password), user["id"])
                )
                conn.commit()

        if not valid:
            return {"message": "Invalid email, password or role."}, 401

        public_user = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }

        return {
            "message": "Login successful.",
            "token": create_auth_token(user["id"]),
            "user": public_user
        }, 200

    finally:
        conn.close()


# ---------------- VIEW PROFILE ----------------

@app.route("/api/profile", methods=["GET"])
@require_auth
def get_profile():
    return {"user": request.current_user}, 200


# ---------------- UPDATE PROFILE ----------------

@app.route("/api/profile", methods=["PUT"])
@require_auth
def update_profile():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()

    if not name or not email:
        return {"message": "Name and email are required."}, 400

    if len(name) > 100 or len(email) > 254:
        return {"message": "Name or email is too long."}, 400

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        return {"message": "Enter a valid email address."}, 400

    user_id = request.current_user["id"]

    conn = get_db_connection()
    try:
        other = conn.execute(
            """
            SELECT id FROM users
            WHERE LOWER(email) = ? AND id != ?
            """,
            (email, user_id)
        ).fetchone()

        if other:
            return {"message": "That email is already in use."}, 409

        conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (name, email, user_id)
        )
        conn.commit()

        return {
            "message": "Profile updated successfully.",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": request.current_user["role"]
            }
        }, 200

    finally:
        conn.close()


# ---------------- DELETE ACCOUNT ----------------

@app.route("/api/account", methods=["DELETE"])
@require_auth
def delete_account():
    user = request.current_user

    # Prevent deleting the administrator through the normal account flow.
    if user["role"].lower() == "admin":
        return {
            "message": "Admin accounts cannot be deleted through this option."
        }, 403

    data = request.get_json(silent=True) or {}
    password = str(data.get("password", ""))

    if not password:
        return {"message": "Enter your password to confirm deletion."}, 400

    conn = get_db_connection()
    try:
        record = conn.execute(
            "SELECT password FROM users WHERE id = ?",
            (user["id"],)
        ).fetchone()

        if record is None:
            return {"message": "Account not found."}, 404

        stored_password = str(record["password"])
        if stored_password.startswith(("scrypt:", "pbkdf2:")):
            valid = check_password_hash(stored_password, password)
        else:
            valid = stored_password == password

        if not valid:
            return {"message": "Incorrect password."}, 401

        conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))
        conn.commit()

        return {"message": "Account deleted successfully."}, 200

    finally:
        conn.close()

# ---------------- LIST E-BOOKS ----------------

@app.route("/api/ebooks", methods=["GET"])
def get_ebooks():
    conn = get_db_connection()
    try:
        ebooks = conn.execute(
            """
            SELECT id, title, author, category, description,
                   filename, created_at
            FROM ebooks
            ORDER BY id DESC
            """
        ).fetchall()

        return [dict(ebook) for ebook in ebooks]
    finally:
        conn.close()


# ---------------- ADMIN UPLOAD E-BOOK ----------------

@app.route("/api/ebooks", methods=["POST"])
@require_admin
def upload_ebook():
    title = request.form.get("title", "").strip()
    author = request.form.get("author", "").strip()
    category = request.form.get("category", "").strip()
    description = request.form.get("description", "").strip()
    pdf = request.files.get("file")

    if not title:
        return {"message": "E-book title is required."}, 400

    if pdf is None or not pdf.filename:
        return {"message": "Please select a PDF file."}, 400

    if not allowed_file(pdf.filename):
        return {"message": "Only PDF files are allowed."}, 400

    safe_name = secure_filename(pdf.filename)
    if not safe_name:
        return {"message": "Invalid filename."}, 400

    # Give each uploaded file a unique stored filename.
    import uuid
    stored_name = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(UPLOAD_FOLDER, stored_name)

    conn = get_db_connection()
    try:
        pdf.save(file_path)

        cursor = conn.execute(
            """
            INSERT INTO ebooks
                (title, author, category, description, filename)
            VALUES (?, ?, ?, ?, ?)
            """,
            (title, author, category, description, stored_name)
        )
        conn.commit()

        return {
            "message": "E-book uploaded successfully.",
            "ebook": {
                "id": cursor.lastrowid,
                "title": title,
                "author": author,
                "category": category,
                "description": description,
                "filename": stored_name
            }
        }, 201

    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        app.logger.exception("E-book upload failed")
        return {"message": "E-book upload failed."}, 500
    finally:
        conn.close()


# ---------------- READ / DOWNLOAD E-BOOK ----------------

@app.route("/api/ebooks/<int:ebook_id>/file", methods=["GET"])
def get_ebook_file(ebook_id):
    conn = get_db_connection()
    try:
        ebook = conn.execute(
            "SELECT filename FROM ebooks WHERE id = ?",
            (ebook_id,)
        ).fetchone()
    finally:
        conn.close()

    if ebook is None:
        return {"message": "E-book not found."}, 404

    filename = ebook["filename"]
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.isfile(file_path):
        return {"message": "E-book file not found."}, 404

    download = request.args.get("download", "").lower() == "true"

    return send_from_directory(
        UPLOAD_FOLDER,
        filename,
        as_attachment=download,
        download_name=filename,
        mimetype="application/pdf"
    )


# ---------------- FILE SIZE ERROR ----------------

@app.errorhandler(413)
def file_too_large(error):
    return {"message": "PDF is too large. Maximum size is 20 MB."}, 413


# ---------------- RUN SERVER ----------------

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
