-- Migration: Create JourneyPool table for daily inner journey content
CREATE TABLE IF NOT EXISTS JourneyPool (
    id TEXT PRIMARY KEY,
    todaysReflection TEXT NOT NULL,
    lookWithin TEXT NOT NULL,
    thoughtToCarry TEXT NOT NULL,
    isUsed INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);
