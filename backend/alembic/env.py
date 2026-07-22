"""
Helix — Alembic Migration Environment
Supports async SQLAlchemy with asyncpg.
"""

import asyncio
from logging.config import fileConfig
from typing import Any

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import ALL models so Alembic can detect them
from src.core.config import settings
from src.infrastructure.database.base import Base

# Phase 1 models
from src.modules.users.models import User  # noqa: F401
from src.modules.auth.models import RefreshToken, OAuthAccount  # noqa: F401
from src.modules.organizations.models import Organization, OrgMembership  # noqa: F401
from src.modules.workspaces.models import Workspace  # noqa: F401

# Phase 2 models
from src.modules.projects.models import (  # noqa: F401
    Project, ProjectMember, IssueState, Label,
)
from src.modules.issues.models import (  # noqa: F401
    Issue, IssueAssignee, IssueLabelLink,
    Comment, Activity, Attachment,
)
from src.modules.notifications.models import InAppNotification  # noqa: F401
from src.modules.cycles.models import Cycle, CycleIssue  # noqa: F401


# Set target metadata
target_metadata = Base.metadata

# Override sqlalchemy.url from settings
config.set_main_option("sqlalchemy.url", settings.database_url_str)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL without a connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations with an async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
