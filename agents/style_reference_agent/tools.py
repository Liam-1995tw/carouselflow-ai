"""
Style reference tools — pull inspiration from design libraries or user uploads.
"""
from typing import Optional


def get_template_by_style(style: str) -> Optional[dict]:
    templates = {
        "minimal": {"bg": "#FFFFFF", "accent": "#000000", "font": "Inter"},
        "bold":    {"bg": "#0D0D0D", "accent": "#FFD700", "font": "Syne"},
        "pastel":  {"bg": "#FFF5F5", "accent": "#FF8FAB", "font": "DM Sans"},
    }
    return templates.get(style.lower())
