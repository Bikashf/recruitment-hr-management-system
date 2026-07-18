from datetime import datetime, timedelta
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    TokenResponse,
    TokenRefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new User (Candidate or HR). Administrative accounts are managed separately."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    
    # Hash password with bcrypt
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticates credentials and returns a pair of Access and Refresh tokens."""
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Generate tokens with role claims embedded for frontend routing efficiency
    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.email, "role": user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        email=user.email,
        id=user.id,
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Rotates an expired Access token using a valid Refresh token."""
    payload = decode_token(refresh_in.refresh_token, expected_type="refresh")
    email: str = payload.get("sub")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.email, "role": user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        email=user.email,
        id=user.id,
    )

@router.post("/forgot-password")
def forgot_password(forgot_in: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a secure password reset token, saves it, and logs the reset link.
    """
    user = db.query(User).filter(User.email == forgot_in.email).first()
    # Note: To prevent user enumeration attacks, we return a successful message
    # even if the email doesn't exist in our records.
    if user:
        token = secrets.token_hex(20)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(minutes=30)
        db.commit()
        
        # Log the reset link to the console for testing
        print(f"\n[SECURITY NOTICE] Password reset requested for {user.email}.")
        print(f"Reset Link: http://localhost:3001/reset-password?token={token}\n", flush=True)

    return {"detail": "If the email is registered, a password reset link has been logged to the console."}

@router.post("/reset-password")
def reset_password(reset_in: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates the reset token and updates the user's password.
    """
    user = db.query(User).filter(User.reset_token == reset_in.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or used password reset token.",
        )
        
    if not user.reset_token_expires or datetime.utcnow() > user.reset_token_expires:
        # Clear token if expired
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset token has expired.",
        )
        
    # Update password hash and clear reset token
    user.password_hash = get_password_hash(reset_in.password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    
    return {"detail": "Password has been reset successfully."}

