-- CreateTable
CREATE TABLE "UiSubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "uiCategoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UiSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiSubCategoryMap" (
    "id" TEXT NOT NULL,
    "uiSubCategoryId" TEXT NOT NULL,
    "realSubCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UiSubCategoryMap_pkey" PRIMARY KEY ("id")
);
