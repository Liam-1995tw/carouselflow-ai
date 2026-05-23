-- Seed sample brands for development

INSERT INTO brands (name, voice, colors, guidelines) VALUES
(
    'TechPulse',
    'authoritative and forward-looking',
    '["#0A0A0A", "#4F6EF7", "#FFFFFF"]',
    '{"dos": ["Use data-backed claims", "Short punchy sentences"], "donts": ["Avoid jargon", "No passive voice"]}'
),
(
    'GreenLeaf',
    'warm, sustainable, community-first',
    '["#2D6A4F", "#B7E4C7", "#FFFFFF"]',
    '{"dos": ["Lead with impact", "Use inclusive language"], "donts": ["Avoid greenwashing terms"]}'
)
ON CONFLICT DO NOTHING;
