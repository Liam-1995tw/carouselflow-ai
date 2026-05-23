"""Copywriting helpers — readability scoring, CTA banks, hook templates."""

HOOK_TEMPLATES = [
    "The {adjective} truth about {topic}",
    "{number} things nobody tells you about {topic}",
    "Stop doing this with {topic}",
    "How {topic} will change in {year}",
]

CTA_BANK = [
    "Save this for later →",
    "Follow for more insights",
    "Share with someone who needs this",
    "Drop a comment below",
]


def score_readability(text: str) -> float:
    words = text.split()
    if not words:
        return 0.0
    avg_word_len = sum(len(w) for w in words) / len(words)
    return max(0.0, 10.0 - avg_word_len)
