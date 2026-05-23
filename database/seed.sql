-- CarouselFlow AI — Demo Seed Data
-- Topic: "Founder lessons from NYC networking"

USE carouselflow;

INSERT INTO carousel_projects (id, topic, status, style, slide_count) VALUES
('proj_demo_001', 'Founder lessons from NYC networking', 'done', 'dark', 6);

INSERT INTO generated_slides (project_id, slide_index, title, body, image_prompt, bg_color, accent, text_color) VALUES
('proj_demo_001', 1, 'You don''t need to be an engineer to build anymore.',
 'AI tools have made it possible for anyone to create products, workflows, and businesses without writing a single line of code.',
 'Person confidently building at laptop, neon blue glow, dark aesthetic', '#0D0D0D', '#4F6EF7', '#FFFFFF'),

('proj_demo_001', 2, 'AI tools are lowering the barrier.',
 'No-code, AI-assisted workflows are replacing the 6-month MVP timeline. What took a team now takes an afternoon.',
 'Speed lines, floating digital tools, dark background, modern', '#0D0D0D', '#4F6EF7', '#FFFFFF'),

('proj_demo_001', 3, 'The real edge is showing up consistently.',
 'I watched underdogs outpace funded teams — just by shipping daily and iterating in public.',
 'Clock with forward motion, upward trajectory, minimal dark', '#0D0D0D', '#4F6EF7', '#FFFFFF'),

('proj_demo_001', 4, 'I saw artists, lawyers, creators, and founders building together.',
 'NYC networking wasn''t just tech bros. It was a convergence of disciplines using the same AI tools.',
 'Diverse group collaborating, city skyline at night, warm lighting', '#0D0D0D', '#4F6EF7', '#FFFFFF'),

('proj_demo_001', 5, 'Start with one small workflow.',
 'One automated task becomes a product. A product becomes a business. Start with what you do manually today.',
 'Single domino falling, chain reaction, dark minimalist', '#0D0D0D', '#4F6EF7', '#FFFFFF'),

('proj_demo_001', 6, 'Comment BUILD if you want the workflow.',
 'Follow for weekly AI tools breakdowns for non-technical builders. New post every Tuesday.',
 'Bold CTA slide, arrow pointing forward, brand blue accent', '#0D0D0D', '#4F6EF7', '#FFFFFF');

-- Seed agent events for the demo project
INSERT INTO agent_events (project_id, agent_name, event_type, content, sponsor, duration_ms, tokens_used) VALUES
('proj_demo_001', 'research',         'done', 'Identified 5 key insights, target audience, and narrative arc', 'deepmind',   920, 512),
('proj_demo_001', 'style_reference',  'done', 'Dark minimal style: #0D0D0D bg, #4F6EF7 accent, Inter font',  'deepmind',   680, 320),
('proj_demo_001', 'brand',            'done', 'Voice: Inspirational and direct. Lead with insight.',          'deepmind',   540, 280),
('proj_demo_001', 'copywriting',      'done', 'Generated 6 slides with hook, value, and CTA',                'deepmind',  1240, 890),
('proj_demo_001', 'carousel_engine',  'done', 'Assembled and persisted 6 slides to ClickHouse',              'clickhouse',  180, 0);
