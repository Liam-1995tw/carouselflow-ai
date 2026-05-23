"""Brand asset tools — fetch logo, color palettes, and guidelines."""
from typing import Optional


BRAND_REGISTRY: dict[str, dict] = {}


def register_brand(brand_id: str, data: dict) -> None:
    BRAND_REGISTRY[brand_id] = data


def lookup_brand(brand_id: str) -> Optional[dict]:
    return BRAND_REGISTRY.get(brand_id)
