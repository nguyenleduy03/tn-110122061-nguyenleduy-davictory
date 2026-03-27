-- Add imageUrl column to matching_pairs table for dropdown with images
ALTER TABLE matching_pairs 
ADD COLUMN image_url VARCHAR(500) AFTER right_content;

-- Add comment
ALTER TABLE matching_pairs 
MODIFY COLUMN image_url VARCHAR(500) COMMENT 'URL ảnh cho dropdown (Google Drive link)';
