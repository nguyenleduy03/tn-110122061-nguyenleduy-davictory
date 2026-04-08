-- Update NULL createdAt and updatedAt for existing tests
UPDATE tests 
SET 
    createdAt = COALESCE(createdAt, NOW()),
    updatedAt = COALESCE(updatedAt, NOW())
WHERE createdAt IS NULL OR updatedAt IS NULL;
