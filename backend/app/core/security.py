"""
Password security utilities using bcrypt.
Enforces sensible length limits and prevents bcrypt's 72-byte silent truncation.
"""
import bcrypt

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72


def validate_password_policy(password: str) -> None:
    """
    Validates password input against security constraints:
    - Must be a non-empty string.
    - Must be at least 8 characters long.
    - UTF-8 byte length must not exceed bcrypt's 72-byte limit to prevent silent truncation.
    """
    if not isinstance(password, str):
        raise ValueError("Password must be a string.")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
        )
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > MAX_PASSWORD_BYTES:
        raise ValueError(
            f"Password exceeds bcrypt maximum length limit of {MAX_PASSWORD_BYTES} bytes."
        )


def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using bcrypt with a securely generated salt.
    Enforces password validation policy before hashing.
    Never logs or stores the plaintext password.
    """
    validate_password_policy(password)
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a stored bcrypt hash.
    Enforces the 72-byte limit to prevent bcrypt truncation bypass.
    Returns False safely if inputs are invalid, mismatched, or corrupted.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        plain_bytes = plain_password.encode("utf-8")
        if len(plain_bytes) > MAX_PASSWORD_BYTES:
            return False
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False
