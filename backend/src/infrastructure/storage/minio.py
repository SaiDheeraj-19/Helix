"""
Helix Backend — MinIO Storage Client
S3-compatible object storage for attachments, avatars, and documents.
"""

from typing import Any, BinaryIO

import boto3
import structlog
from botocore.client import Config
from botocore.exceptions import ClientError

from src.core.config import settings

logger = structlog.get_logger(__name__)

_s3_client = None


def _create_s3_client() -> Any:
    return boto3.client(
        "s3",
        endpoint_url=f"{'https' if settings.MINIO_USE_SSL else 'http'}://{settings.MINIO_ENDPOINT}",
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",  # MinIO ignores region but boto3 requires it
    )


async def init_minio() -> None:
    """Initialize MinIO and create required buckets."""
    global _s3_client

    if not settings.MINIO_ENABLED:
        logger.warning("minio_disabled", reason="MINIO_ENDPOINT is 'dummy' or not configured")
        return

    try:
        _s3_client = _create_s3_client()

        buckets = [
            settings.MINIO_BUCKET_ATTACHMENTS,
            settings.MINIO_BUCKET_AVATARS,
            settings.MINIO_BUCKET_DOCUMENTS,
        ]

        for bucket in buckets:
            try:
                _s3_client.head_bucket(Bucket=bucket)
                logger.debug("minio_bucket_exists", bucket=bucket)
            except ClientError as e:
                if e.response["Error"]["Code"] == "404":
                    _s3_client.create_bucket(Bucket=bucket)
                    logger.info("minio_bucket_created", bucket=bucket)
                else:
                    logger.error("minio_bucket_error", bucket=bucket, error=str(e))

        logger.info("minio_initialized")
    except Exception as exc:
        logger.warning("minio_init_failed", error=str(exc), reason="File uploads will be unavailable")
        _s3_client = None


def get_s3_client() -> Any:
    if _s3_client is None:
        return None  # Callers should handle None gracefully
    return _s3_client


class StorageService:
    """High-level file storage operations."""

    def __init__(self) -> None:
        self._client = get_s3_client()

    def upload_file(
        self,
        bucket: str,
        key: str,
        file_obj: BinaryIO,
        content_type: str = "application/octet-stream",
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Upload a file and return its public URL."""
        extra_args: dict[str, Any] = {"ContentType": content_type}
        if metadata:
            extra_args["Metadata"] = {k: str(v) for k, v in metadata.items()}

        self._client.upload_fileobj(file_obj, bucket, key, ExtraArgs=extra_args)
        return self.get_file_url(bucket, key)

    def get_file_url(self, bucket: str, key: str) -> str:
        """Get the public URL for a file.
        In a real setup with CDN, this would prepend the CDN domain."""
        if not settings.MINIO_ENABLED:
            return f"/mock-storage/{bucket}/{key}"
        url = f"{settings.MINIO_PUBLIC_URL}/{bucket}/{key}"
        return url

    def generate_presigned_upload_url(
        self,
        bucket: str,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> dict[str, Any]:
        """Generate a presigned URL for direct browser → MinIO upload."""
        url = self._client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )
        return {
            "upload_url": url,
            "key": key,
            "bucket": bucket,
        }

    def generate_presigned_download_url(
        self,
        bucket: str,
        key: str,
        expires_in: int = 3600,
        filename: str | None = None,
    ) -> str:
        """Generate a presigned URL for file download."""
        params: dict[str, Any] = {"Bucket": bucket, "Key": key}
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

        return str(
            self._client.generate_presigned_url(
                "get_object", Params=params, ExpiresIn=expires_in
            )
        )

    def delete_file(self, bucket: str, key: str) -> None:
        """Delete a file from storage."""
        self._client.delete_object(Bucket=bucket, Key=key)
        logger.info("file_deleted", bucket=bucket, key=key)
