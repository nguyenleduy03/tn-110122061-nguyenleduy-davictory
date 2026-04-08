-- Fix NULL timestamps for existing tests
-- Run this SQL directly in your MySQL database

UPDATE tests 
SET 
    createdAt = COALESCE(createdAt, NOW()),
    updatedAt = COALESCE(updatedAt, NOW())
WHERE createdAt IS NULL OR updatedAt IS NULL;

-- Verify the fix
SELECT id, title, createdAt, updatedAt 
FROM tests 
WHERE createdAt IS NULL OR updatedAt IS NULL;
