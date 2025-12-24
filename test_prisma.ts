import "dotenv/config";
import { PrismaClient } from "@prisma/client";

try {
    const prisma = new PrismaClient({
        // @ts-ignore
        datasourceUrl: process.env.DATABASE_URL
    });
    console.log("Instantiated with datasourceUrl");
} catch (e) {
    console.log("Failed with datasourceUrl:", e);
}

try {
    const prisma = new PrismaClient({
        // @ts-ignore
        datasources: { db: { url: process.env.DATABASE_URL } }
    });
    console.log("Instantiated with datasources");
} catch (e) {
    console.log("Failed with datasources:", e);
}

try {
    const prisma = new PrismaClient();
    console.log("Instantiated empty");
} catch (e) {
    console.log("Failed empty:", e);
}
