CREATE INDEX IF NOT EXISTS idx_content_created ON Content(createdAt);
CREATE INDEX IF NOT EXISTS idx_content_category ON Content(category);
CREATE INDEX IF NOT EXISTS idx_bookmark_user ON Bookmark(userId);
CREATE INDEX IF NOT EXISTS idx_chat_user ON ChatSession(userId);
CREATE INDEX IF NOT EXISTS idx_notification_user_created ON Notification(userId, createdAt);
CREATE INDEX IF NOT EXISTS idx_journey_order ON JourneyPool(createdAt, id);
CREATE INDEX IF NOT EXISTS idx_foryou_order ON ForYouPool(createdAt, id);
