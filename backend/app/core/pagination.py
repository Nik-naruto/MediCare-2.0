"""Pagination, Sorting, and Search Helper Utilities."""

import math
from typing import Any, List, Optional
from fastapi import Query, Response
from sqlalchemy.orm import InstrumentedAttribute


class PaginationParams:
    """Dependency parsing pagination, sorting, and ordering query parameters."""

    def __init__(
        self,
        page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed, preferred approach)"),
        page_size: Optional[int] = Query(None, ge=1, le=1000, description="Items per page (max 1000)"),
        skip: Optional[int] = Query(None, ge=0, description="Number of items to skip (backward compatibility)"),
        limit: Optional[int] = Query(None, ge=1, le=1000, description="Maximum items to return (backward compatibility)"),
        sort_by: Optional[str] = Query(None, description="Column name to sort by"),
        sort_order: str = Query("desc", description="Sort direction: 'asc' or 'desc'"),
    ):
        # Resolve page_size / limit
        if page_size is not None:
            resolved_limit = page_size
        elif limit is not None:
            resolved_limit = limit
        else:
            resolved_limit = 100

        # Resolve offset / skip
        if page is not None:
            resolved_page = page
            resolved_skip = (page - 1) * resolved_limit
        elif skip is not None:
            resolved_skip = skip
            resolved_page = (skip // resolved_limit) + 1 if resolved_limit > 0 else 1
        else:
            resolved_skip = 0
            resolved_page = 1

        self.page = resolved_page
        self.page_size = resolved_limit
        self.skip = resolved_skip
        self.limit = resolved_limit
        self.sort_by = sort_by.strip() if sort_by else None
        self.sort_order = sort_order.strip().lower() if sort_order else "desc"


def add_pagination_headers(response: Response, total: int, skip: int, limit: int):
    """Inject standard pagination metadata headers into HTTP response."""
    page_size = limit if limit > 0 else 100
    page = (skip // page_size) + 1 if page_size > 0 else 1
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    response.headers["X-Total-Pages"] = str(total_pages)


def apply_safe_sorting(
    stmt: Any,
    model: Any,
    sort_by: Optional[str],
    sort_order: str,
    allowlist: dict[str, Any],
    default_sort: Any,
):
    """Apply sorting to a SQLAlchemy Select statement using an explicit field allowlist."""
    if sort_by and sort_by.lower() in allowlist:
        column_attr = allowlist[sort_by.lower()]
        if sort_order == "asc":
            return stmt.order_by(column_attr.asc())
        return stmt.order_by(column_attr.desc())
    
    # Apply default deterministic sorting
    if isinstance(default_sort, list):
        return stmt.order_by(*default_sort)
    return stmt.order_by(default_sort)
