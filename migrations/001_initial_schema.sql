CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    audio_file_name VARCHAR(255) NOT NULL,
    duration FLOAT NOT NULL,
    sample_rate INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    label VARCHAR(100) NOT NULL,
    confidence FLOAT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotations_project_id ON annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_annotations_time_range ON annotations(start_time, end_time);

CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    yamnet_classes VARCHAR(255),
    color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO labels (name, yamnet_classes, color) VALUES
('狗叫', 'Dog, Bark', '#ef4444'),
('汽车鸣笛', 'Vehicle horn, Car horn', '#f59e0b'),
('雨声', 'Rain', '#3b82f6'),
('鸟鸣', 'Bird, Bird vocalization, Chirp, Tweet', '#10b981'),
('人声', 'Speech, Human voice, Conversation', '#8b5cf6'),
('背景音乐', 'Music, Background music, Musical instrument', '#ec4899'),
('脚步声', 'Footstep, Walking', '#06b6d4'),
('敲门声', 'Knock, Tap', '#84cc16'),
('警报声', 'Siren, Alarm, Emergency vehicle', '#dc2626'),
('笑声', 'Laughter, Giggle', '#f472b6')
ON CONFLICT (name) DO NOTHING;
