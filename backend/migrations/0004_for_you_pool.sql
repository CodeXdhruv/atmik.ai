-- Migration: Create ForYouPool table for daily "For You Today" micro-experiences
CREATE TABLE IF NOT EXISTS ForYouPool (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    question TEXT NOT NULL,
    helper TEXT NOT NULL,
    releaseOptions TEXT NOT NULL,
    transitionLabel TEXT NOT NULL,
    secondQuestion TEXT NOT NULL,
    spaceOptions TEXT NOT NULL,
    completion TEXT NOT NULL,
    response_messages TEXT,
    createdAt TEXT NOT NULL
);
