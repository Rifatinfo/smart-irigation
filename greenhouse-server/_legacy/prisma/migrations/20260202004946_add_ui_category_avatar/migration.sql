-- CreateTable
CREATE TABLE "UiCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UiCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiCategoryMap" (
    "id" TEXT NOT NULL,
    "uiCategoryId" TEXT NOT NULL,
    "realCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UiCategoryMap_pkey" PRIMARY KEY ("id")
);
