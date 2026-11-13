-- CreateTable
CREATE TABLE "shop_managers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_managers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_managers_userId_key" ON "shop_managers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_managers_email_key" ON "shop_managers"("email");

-- AddForeignKey
ALTER TABLE "shop_managers" ADD CONSTRAINT "shop_managers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
