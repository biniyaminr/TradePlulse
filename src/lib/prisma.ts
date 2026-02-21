import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

// Resolve the SQLite file path relative to the project root
const dbPath = path.resolve(process.cwd(), "prisma/dev.db");

function createPrismaClient() {
    // PrismaBetterSqlite3 v7 takes a connection-string style { url } object
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
}

// Prevent multiple PrismaClient instances during Next.js hot reloading in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
