-- Add instructions field to question_groups table
ALTER TABLE question_groups 
ADD COLUMN instructions TEXT NULL 
AFTER title;
