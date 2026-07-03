-- Repair diao formulas saved before square objects were serialized as JSON.
UPDATE "material_formulas"
SET "square" = ("formula_data"::jsonb -> 'square')::text
WHERE "formula_type" = 'diao'
  AND "square" = '[object Object]'
  AND "formula_data" IS NOT NULL
  AND "formula_data" ~ '^\s*\{'
  AND "formula_data"::jsonb ? 'square';
