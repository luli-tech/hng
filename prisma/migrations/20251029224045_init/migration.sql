-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "capital" TEXT,
    "region" TEXT,
    "population" INTEGER NOT NULL,
    "currency_code" TEXT,
    "exchange_rate" REAL,
    "estimated_gdp" REAL,
    "flag_url" TEXT,
    "last_refreshed_at" DATETIME
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "total_countries" INTEGER NOT NULL,
    "last_refreshed_at" DATETIME NOT NULL,
    "summary_svg" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");
