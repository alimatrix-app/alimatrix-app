-- Zoptymalizowana baza danych dla AliMatrix
-- Migracja: Dodanie rozszerzonych tabel i kolumn dla pełnych danych formularza

-- Najpierw upewniamy się, że usuwamy wszystkie tabele, które będziemy tworzyć ponownie
DROP TABLE IF EXISTS "Child";
DROP TABLE IF EXISTS "Dochody";

-- Najpierw dodajemy kolumny do tabeli FormSubmission
ALTER TABLE "FormSubmission"
ADD COLUMN IF NOT EXISTS "sciezkaWybor" TEXT,
ADD COLUMN IF NOT EXISTS "podstawaUstalen" TEXT,
ADD COLUMN IF NOT EXISTS "podstawaUstalenInne" TEXT,
ADD COLUMN IF NOT EXISTS "wariantPostepu" TEXT,
ADD COLUMN IF NOT EXISTS "sposobFinansowania" TEXT,
ADD COLUMN IF NOT EXISTS "plecUzytkownika" TEXT,
ADD COLUMN IF NOT EXISTS "wiekUzytkownika" TEXT,
ADD COLUMN IF NOT EXISTS "wojewodztwoUzytkownika" TEXT,
ADD COLUMN IF NOT EXISTS "miejscowoscUzytkownika" TEXT,
ADD COLUMN IF NOT EXISTS "stanCywilnyUzytkownika" TEXT,
ADD COLUMN IF NOT EXISTS "plecDrugiegoRodzica" TEXT,
ADD COLUMN IF NOT EXISTS "wiekDrugiegoRodzica" TEXT,
ADD COLUMN IF NOT EXISTS "wojewodztwoDrugiegoRodzica" TEXT,
ADD COLUMN IF NOT EXISTS "miejscowoscDrugiegoRodzica" TEXT,
ADD COLUMN IF NOT EXISTS "sadRejonowyId" TEXT,
ADD COLUMN IF NOT EXISTS "dataDecyzjiSad" TEXT,
ADD COLUMN IF NOT EXISTS "miesiacDecyzjiSad" TEXT,
ADD COLUMN IF NOT EXISTS "liczbaSedzi" TEXT,
ADD COLUMN IF NOT EXISTS "plecSedziego" TEXT,
ADD COLUMN IF NOT EXISTS "inicjalySedziego" TEXT,
ADD COLUMN IF NOT EXISTS "czyPozew" TEXT,
ADD COLUMN IF NOT EXISTS "dataPorozumienia" TEXT,
ADD COLUMN IF NOT EXISTS "sposobPorozumienia" TEXT,
ADD COLUMN IF NOT EXISTS "formaPorozumienia" TEXT,
ADD COLUMN IF NOT EXISTS "klauzulaWaloryzacyjna" TEXT,
ADD COLUMN IF NOT EXISTS "dataUstalenInnych" TEXT,
ADD COLUMN IF NOT EXISTS "uzgodnienieFinansowania" TEXT,
ADD COLUMN IF NOT EXISTS "planyWystapieniaDoSadu" TEXT,
ADD COLUMN IF NOT EXISTS "ocenaAdekwatnosciSad" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "ocenaAdekwatnosciPorozumienie" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "ocenaAdekwatnosciInne" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "liczbaDzieci" INTEGER;

-- Tworzenie tabeli dla dzieci
CREATE TABLE "Child" (
  "id" TEXT NOT NULL,
  "formSubmissionId" TEXT NOT NULL,
  "childId" INTEGER NOT NULL,
  "wiek" INTEGER,
  "plec" TEXT,
  "specjalnePotrzeby" BOOLEAN NOT NULL DEFAULT false,
  "opisSpecjalnychPotrzeb" TEXT,
  "uczeszczeDoPlacowki" BOOLEAN,
  "typPlacowki" TEXT,
  "opiekaInnejOsoby" BOOLEAN,
  "modelOpieki" TEXT,
  "cyklOpieki" TEXT,
  "procentCzasuOpieki" DOUBLE PRECISION,
  "kwotaAlimentow" DOUBLE PRECISION,
  "twojeMiesieczneWydatki" DOUBLE PRECISION,
  "wydatkiDrugiegoRodzica" DOUBLE PRECISION,
  "kosztyUznanePrzezSad" DOUBLE PRECISION,
  "rentaRodzinna" BOOLEAN NOT NULL DEFAULT false,
  "rentaRodzinnaKwota" DOUBLE PRECISION,
  "swiadczeniePielegnacyjne" BOOLEAN NOT NULL DEFAULT false,
  "swiadczeniePielegnacyjneKwota" DOUBLE PRECISION,
  "inneZrodla" BOOLEAN NOT NULL DEFAULT false,
  "inneZrodlaOpis" TEXT,
  "inneZrodlaKwota" DOUBLE PRECISION,
  "brakDodatkowychZrodel" BOOLEAN NOT NULL DEFAULT true,
  "tabelaCzasu" JSONB,
  "wskaznikiCzasuOpieki" JSONB,
  "wakacjeProcentCzasu" DOUBLE PRECISION,
  "wakacjeSzczegolowyPlan" BOOLEAN NOT NULL DEFAULT false,
  "wakacjeOpisPlan" TEXT,
  
  PRIMARY KEY ("id"),
  CONSTRAINT "Child_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indeksy dla tabeli Child
CREATE INDEX "Child_formSubmissionId_idx" ON "Child"("formSubmissionId");
CREATE UNIQUE INDEX "Child_formSubmissionId_childId_idx" ON "Child"("formSubmissionId", "childId");

-- Tworzenie tabeli dla dochodów rodziców
CREATE TABLE "Dochody" (
  "id" TEXT NOT NULL,
  "formSubmissionId" TEXT NOT NULL,
  "wlasneDochodyNetto" DOUBLE PRECISION,
  "wlasnePotencjalDochodowy" DOUBLE PRECISION,
  "wlasneKosztyUtrzymania" DOUBLE PRECISION,
  "wlasneKosztyInni" DOUBLE PRECISION,
  "wlasneDodatkoweZobowiazania" DOUBLE PRECISION,
  "drugiRodzicDochody" DOUBLE PRECISION,
  "drugiRodzicPotencjal" DOUBLE PRECISION,
  "drugiRodzicKoszty" DOUBLE PRECISION,
  "drugiRodzicKosztyInni" DOUBLE PRECISION,
  "drugiRodzicDodatkowe" DOUBLE PRECISION,
  
  PRIMARY KEY ("id"),
  CONSTRAINT "Dochody_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indeksy dla tabeli Dochody
CREATE UNIQUE INDEX "Dochody_formSubmissionId_idx" ON "Dochody"("formSubmissionId");

-- Dodatkowe indeksy dla wyszukiwania w FormSubmission
-- Sprawdzamy, czy indeks już istnieje przed próbą utworzenia go
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'FormSubmission_sposobFinansowania_idx'
    ) THEN
        EXECUTE 'CREATE INDEX "FormSubmission_sposobFinansowania_idx" ON "FormSubmission"("sposobFinansowania")';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'FormSubmission_podstawaUstalen_idx'
    ) THEN
        EXECUTE 'CREATE INDEX "FormSubmission_podstawaUstalen_idx" ON "FormSubmission"("podstawaUstalen")';
    END IF;
END $$;

-- Funkcja do wypełnienia nowych kolumn i tabel danymi z istniejących rekordów JSON
CREATE OR REPLACE FUNCTION populate_new_schema()
RETURNS VOID AS $$
DECLARE
  form_rec RECORD;
  json_data JSONB;
  dziecko_json JSONB;
  dziecko_rec RECORD;
  dochody_id TEXT;
  child_id TEXT;
BEGIN
  -- Dla każdego formularza w bazie
  FOR form_rec IN SELECT id, "formData" FROM "FormSubmission"
  LOOP
    json_data := form_rec."formData"::JSONB;
    
    -- Aktualizacja podstawowych pól formularza
    UPDATE "FormSubmission" SET
      "sciezkaWybor" = json_data->>'sciezkaWybor',
      "podstawaUstalen" = json_data->>'podstawaUstalen',
      "podstawaUstalenInne" = json_data->>'podstawaUstalenInne',
      "wariantPostepu" = json_data->>'wariantPostepu',
      "sposobFinansowania" = json_data->>'sposobFinansowania',
      "plecUzytkownika" = json_data->>'plecUzytkownika',
      "wiekUzytkownika" = json_data->>'wiekUzytkownika',
      "wojewodztwoUzytkownika" = json_data->>'wojewodztwoUzytkownika',
      "miejscowoscUzytkownika" = json_data->>'miejscowoscUzytkownika',
      "stanCywilnyUzytkownika" = json_data->>'stanCywilnyUzytkownika',
      "plecDrugiegoRodzica" = json_data->>'plecDrugiegoRodzica',
      "wiekDrugiegoRodzica" = json_data->>'wiekDrugiegoRodzica',
      "wojewodztwoDrugiegoRodzica" = json_data->>'wojewodztwoDrugiegoRodzica',
      "miejscowoscDrugiegoRodzica" = json_data->>'miejscowoscDrugiegoRodzica',
      "rodzajSaduSad" = json_data->>'rodzajSaduSad',
      "sadRejonowyId" = json_data->>'sadRejonowyId',
      "sadOkregowyId" = json_data->>'sadOkregowyId',
      "dataDecyzjiSad" = json_data->>'dataDecyzjiSad',
      "rokDecyzjiSad" = json_data->>'rokDecyzjiSad',
      "miesiacDecyzjiSad" = json_data->>'miesiacDecyzjiSad',
      "liczbaSedzi" = json_data->>'liczbaSedzi',
      "plecSedziego" = json_data->>'plecSedziego',
      "inicjalySedziego" = json_data->>'inicjalySedziego',
      "czyPozew" = json_data->>'czyPozew',
      "watekWiny" = json_data->>'watekWiny',
      "dataPorozumienia" = json_data->>'dataPorozumienia',
      "sposobPorozumienia" = json_data->>'sposobPorozumienia',
      "formaPorozumienia" = json_data->>'formaPorozumienia',
      "klauzulaWaloryzacyjna" = json_data->>'klauzulaWaloryzacyjna',
      "dataUstalenInnych" = json_data->>'dataUstalenInnych',
      "uzgodnienieFinansowania" = json_data->>'uzgodnienieFinansowania',
      "planyWystapieniaDoSadu" = json_data->>'planyWystapieniaDoSadu',
      "ocenaAdekwatnosciSad" = (json_data->>'ocenaAdekwatnosciSad')::DOUBLE PRECISION,
      "ocenaAdekwatnosciPorozumienie" = (json_data->>'ocenaAdekwatnosciPorozumienie')::DOUBLE PRECISION,
      "ocenaAdekwatnosciInne" = (json_data->>'ocenaAdekwatnosciInne')::DOUBLE PRECISION,
      "liczbaDzieci" = (json_data->>'liczbaDzieci')::INTEGER
    WHERE id = form_rec.id;

    -- Dodajemy dane dzieci, jeśli istnieją
    IF json_data->'dzieci' IS NOT NULL AND json_data->'dzieci' != 'null' THEN
      FOR dziecko_json IN SELECT jsonb_array_elements(json_data->'dzieci')
      LOOP
        -- Generowanie unikalnego ID dla dziecka
        child_id := gen_random_uuid()::TEXT;
        
        -- Wstawianie danych dziecka
        INSERT INTO "Child" (
          "id",
          "formSubmissionId",
          "childId",
          "wiek",
          "plec",
          "specjalnePotrzeby",
          "opisSpecjalnychPotrzeb",
          "uczeszczeDoPlacowki",
          "typPlacowki",
          "opiekaInnejOsoby",
          "modelOpieki",
          "cyklOpieki",
          "procentCzasuOpieki",
          "tabelaCzasu",
          "wskaznikiCzasuOpieki",
          "wakacjeProcentCzasu",
          "wakacjeSzczegolowyPlan",
          "wakacjeOpisPlan"
        ) VALUES (
          child_id,
          form_rec.id,
          (dziecko_json->>'id')::INTEGER,
          (dziecko_json->>'wiek')::INTEGER,
          dziecko_json->>'plec',
          COALESCE((dziecko_json->>'specjalnePotrzeby')::BOOLEAN, false),
          dziecko_json->>'opisSpecjalnychPotrzeb',
          (dziecko_json->>'uczeszczeDoPlacowki')::BOOLEAN,
          dziecko_json->>'typPlacowki',
          (dziecko_json->>'opiekaInnejOsoby')::BOOLEAN,
          dziecko_json->>'modelOpieki',
          dziecko_json->>'cyklOpieki',
          (dziecko_json->>'procentCzasuOpieki')::DOUBLE PRECISION,
          dziecko_json->'tabelaCzasu',
          dziecko_json->'wskaznikiCzasuOpieki',
          (dziecko_json->>'wakacjeProcentCzasu')::DOUBLE PRECISION,
          COALESCE((dziecko_json->>'wakacjeSzczegolowyPlan')::BOOLEAN, false),
          dziecko_json->>'wakacjeOpisPlan'
        );
      END LOOP;
    END IF;

    -- Pobieranie danych o kosztach dziecka, jeśli istnieją
    IF json_data->'kosztyDzieci' IS NOT NULL AND json_data->'kosztyDzieci' != 'null' THEN
      FOR dziecko_rec IN 
        SELECT c.id AS child_id, c."childId", k.*
        FROM "Child" c
        CROSS JOIN LATERAL (
          SELECT jsonb_array_elements(json_data->'kosztyDzieci') AS koszt
        ) k
        WHERE c."formSubmissionId" = form_rec.id 
        AND (k.koszt->>'id')::INTEGER = c."childId"
      LOOP
        -- Aktualizacja danych o kosztach dziecka
        UPDATE "Child" SET
          "kwotaAlimentow" = (dziecko_rec.koszt->>'kwotaAlimentow')::DOUBLE PRECISION,
          "twojeMiesieczneWydatki" = (dziecko_rec.koszt->>'twojeMiesieczneWydatki')::DOUBLE PRECISION,
          "wydatkiDrugiegoRodzica" = (dziecko_rec.koszt->>'wydatkiDrugiegoRodzica')::DOUBLE PRECISION,
          "kosztyUznanePrzezSad" = (dziecko_rec.koszt->>'kosztyUznanePrzezSad')::DOUBLE PRECISION,
          "rentaRodzinna" = COALESCE((dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'rentaRodzinna')::BOOLEAN, false),
          "rentaRodzinnaKwota" = (dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'rentaRodzinnaKwota')::DOUBLE PRECISION,
          "swiadczeniePielegnacyjne" = COALESCE((dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'swiadczeniePielegnacyjne')::BOOLEAN, false),
          "swiadczeniePielegnacyjneKwota" = (dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'swiadczeniePielegnacyjneKwota')::DOUBLE PRECISION,
          "inneZrodla" = COALESCE((dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'inne')::BOOLEAN, false),
          "inneZrodlaOpis" = dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'inneOpis',
          "inneZrodlaKwota" = (dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'inneKwota')::DOUBLE PRECISION,
          "brakDodatkowychZrodel" = COALESCE((dziecko_rec.koszt->'inneZrodlaUtrzymania'->>'brakDodatkowychZrodel')::BOOLEAN, true)
        WHERE id = dziecko_rec.child_id;
      END LOOP;
    END IF;

    -- Dodajemy dane dochodów, jeśli istnieją
    IF json_data->'dochodyRodzicow' IS NOT NULL AND json_data->'dochodyRodzicow' != 'null' THEN
      -- Generowanie unikalnego ID dla dochodów
      dochody_id := gen_random_uuid()::TEXT;
      
      -- Wstawianie danych dochodów
      INSERT INTO "Dochody" (
        "id",
        "formSubmissionId",
        "wlasneDochodyNetto",
        "wlasnePotencjalDochodowy",
        "wlasneKosztyUtrzymania",
        "wlasneKosztyInni",
        "wlasneDodatkoweZobowiazania",
        "drugiRodzicDochody",
        "drugiRodzicPotencjal",
        "drugiRodzicKoszty",
        "drugiRodzicKosztyInni",
        "drugiRodzicDodatkowe"
      ) VALUES (
        dochody_id,
        form_rec.id,
        (json_data->'dochodyRodzicow'->'wlasne'->>'oficjalneDochodyNetto')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'wlasne'->>'potencjalDochodowy')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'wlasne'->>'kosztyUtrzymaniaSiebie')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'wlasne'->>'kosztyUtrzymaniaInnychOsob')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'wlasne'->>'dodatkoweZobowiazania')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'drugiRodzic'->>'oficjalneDochodyNetto')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'drugiRodzic'->>'potencjalDochodowy')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'drugiRodzic'->>'kosztyUtrzymaniaSiebie')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'drugiRodzic'->>'kosztyUtrzymaniaInnychOsob')::DOUBLE PRECISION,
        (json_data->'dochodyRodzicow'->'drugiRodzic'->>'dodatkoweZobowiazania')::DOUBLE PRECISION
      );
    END IF;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Wywołanie funkcji do wypełnienia nowego schematu
SELECT populate_new_schema();

-- Usunięcie funkcji po zakończeniu
DROP FUNCTION IF EXISTS populate_new_schema();
