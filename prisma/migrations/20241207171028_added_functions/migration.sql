-- CreateTable
CREATE TABLE "Function" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "entryPoint" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT DEFAULT 'javascript',
    "runtime" TEXT DEFAULT 'nodejs',
    "version" TEXT DEFAULT '1.0.0',
    "timeout" INTEGER DEFAULT 30000,
    "memoryLimit" INTEGER DEFAULT 256,
    "metadata" JSONB DEFAULT '{}',
    "envVars" JSONB DEFAULT '{}',
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Function_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Function_name_key" ON "Function"("name");

-- AddForeignKey
ALTER TABLE "Function" ADD CONSTRAINT "Function_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
