ALTER TABLE "assessments" ADD COLUMN "family" varchar(20);
UPDATE "assessments" SET family = 'minat' WHERE code = 'DISCOVER';
UPDATE "assessments" SET family = 'bakat' WHERE code = 'TALENT';
