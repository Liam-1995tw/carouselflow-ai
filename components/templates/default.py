DEFAULT_TEMPLATE = {
    "name": "default",
    "palette": {
        "bg":      "#FFFFFF",
        "accent":  "#4F6EF7",
        "text":    "#111111",
        "muted":   "#6B7280",
    },
    "typography": "Inter",
    "layout": "centered",
    "slide_ratio": "1:1",
}

TEMPLATES = {
    "default": DEFAULT_TEMPLATE,
    "dark": {
        "name": "dark",
        "palette": {"bg": "#0D0D0D", "accent": "#FFD700", "text": "#FFFFFF", "muted": "#9CA3AF"},
        "typography": "Syne",
        "layout": "full-bleed",
        "slide_ratio": "1:1",
    },
    "pastel": {
        "name": "pastel",
        "palette": {"bg": "#FFF5F5", "accent": "#FF8FAB", "text": "#333333", "muted": "#888888"},
        "typography": "DM Sans",
        "layout": "editorial",
        "slide_ratio": "4:5",
    },
}
