-- Dodajemy nowe pola do modelu Child
ALTER TABLE "Child"
ADD COLUMN IF NOT EXISTS "rokUrodzenia" TEXT,
ADD COLUMN IF NOT EXISTS "miesiacUrodzenia" TEXT;

-- Usunięcie istniejącego indeksu ograniczenia unique
DROP INDEX IF EXISTS "Child_formSubmissionId_childId_idx";

-- Ponowne utworzenie ograniczenia unique
CREATE UNIQUE INDEX "Child_formSubmissionId_childId_idx" ON "Child"("formSubmissionId", "childId");
