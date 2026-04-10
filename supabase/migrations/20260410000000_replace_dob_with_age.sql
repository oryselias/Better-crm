-- ============================================================
-- Replace date_of_birth with age in patients table
-- ============================================================

-- 1. Add age column (smallint = int2)
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS age smallint;

-- 2. Copy data ONLY if both columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'patients' 
      AND column_name = 'date_of_birth'
  ) THEN

    UPDATE public.patients
    SET age = EXTRACT(YEAR FROM AGE(date_of_birth))
    WHERE date_of_birth IS NOT NULL;

  END IF;
END $$;

-- 3. (Optional) enforce constraint
-- ALTER TABLE public.patients ALTER COLUMN age SET NOT NULL;

-- 4. Drop old column safely
ALTER TABLE public.patients 
DROP COLUMN IF EXISTS date_of_birth;

-- 5. Add comment
COMMENT ON COLUMN public.patients.age IS 'Patient age in years';