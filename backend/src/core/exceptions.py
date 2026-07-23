"""
Helix Backend — Global Exception Handlers & Custom Exceptions
Provides consistent error responses across all modules.
"""

from typing import Any
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse
from jose import JWTError
from sqlalchemy.exc import IntegrityError

logger = structlog.get_logger(__name__)


# =============================================================================
# Custom Exception Classes
# =============================================================================


class HelixException(Exception):
    """Base exception for all Helix domain errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class NotFoundError(HelixException):
    def __init__(self, resource: str, identifier: str | None = None) -> None:
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class ConflictError(HelixException):
    def __init__(self, message: str) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
        )


class UnauthorizedError(HelixException):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class ForbiddenError(HelixException):
    def __init__(self, message: str = "You do not have permission to perform this action") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class ValidationError_(HelixException):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class RateLimitError(HelixException):
    def __init__(self) -> None:
        super().__init__(
            message="Too many requests. Please slow down.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
        )


class ServiceUnavailableError(HelixException):
    def __init__(self, service: str) -> None:
        super().__init__(
            message=f"Service '{service}' is temporarily unavailable",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
        )


# =============================================================================
# Error Response Builder
# =============================================================================


def _error_response(
    status_code: int,
    error_code: str,
    message: str,
    request_id: str,
    details: dict[str, Any] | None = None,
) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "errors": {
                "code": error_code,
                "message": message,
                "details": details or {},
            },
            "request_id": request_id,
        },
    )


# =============================================================================
# Exception Handlers — Register on FastAPI App
# =============================================================================


def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""

    @app.exception_handler(HelixException)
    async def helix_exception_handler(request: Request, exc: HelixException) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        logger.warning(
            "domain_exception",
            error_code=exc.error_code,
            message=exc.message,
            path=request.url.path,
            request_id=request_id,
        )
        return _error_response(
            status_code=exc.status_code,
            error_code=exc.error_code,
            message=exc.message,
            request_id=request_id,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        field_errors: dict[str, list[str]] = {}
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"][1:]) or "body"
            field_errors.setdefault(field, []).append(error["msg"])

        return _error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            request_id=request_id,
            details={"fields": field_errors},
        )

    @app.exception_handler(JWTError)
    async def jwt_exception_handler(request: Request, exc: JWTError) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        return _error_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_TOKEN",
            message="Token is invalid or expired",
            request_id=request_id,
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        logger.error("db_integrity_error", error=str(exc), request_id=request_id)
        return _error_response(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            message="A resource with this identifier already exists",
            request_id=request_id,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        logger.exception(
            "unhandled_exception",
            error=str(exc),
            error_type=type(exc).__name__,
            path=request.url.path,
            request_id=request_id,
        )
        return _error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
            request_id=request_id,
        )
