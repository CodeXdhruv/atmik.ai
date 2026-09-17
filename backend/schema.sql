-- schema.sql

CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    firebaseUid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    pushToken TEXT
);

CREATE TABLE IF NOT EXISTS Content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    coverUrl TEXT,
    fileUrl TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    author TEXT,
    description TEXT,
    readTime INTEGER,
    category TEXT
);

CREATE TABLE IF NOT EXISTS Category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parentId TEXT,
    icon TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ChatSession (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    currentSummary TEXT,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS Notification (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS QuotesPool (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS JourneyPool (
    id TEXT PRIMARY KEY,
    todaysReflection TEXT NOT NULL,
    lookWithin TEXT NOT NULL,
    thoughtToCarry TEXT NOT NULL,
    isUsed INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);
