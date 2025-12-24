import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
    try {
        const manga = await prisma.manga.findMany({
            orderBy: { createdAt: 'desc' },
            include: { notifications: true }
        });
        return NextResponse.json(manga);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch manga" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const title = formData.get("title") as string;
        const link = formData.get("link") as string;
        const releaseDay = formData.get("releaseDay") as string;
        const releaseTime = formData.get("releaseTime") as string;
        const releaseIntervalStr = formData.get("releaseInterval") as string;
        const file = formData.get("image") as File | null;

        let releaseInterval: number | null = null;
        let nextReleaseDate: Date | null = null;

        if (releaseIntervalStr) {
            releaseInterval = parseInt(releaseIntervalStr);
            if (!isNaN(releaseInterval)) {
                // Modified: Set initial date to TODAY so user gets notification immediately if they test it.
                // Reset logic will handle the "+ Interval" part later.
                const next = new Date();
                // next.setDate(next.getDate() + releaseInterval); // Commented out to force immediate due
                nextReleaseDate = next;
            }
        }

        let imageUrl = null;

        // ... (image processing omitted)
        if (file && file.size > 0) {
            // ... (keep creating unique filename/path)
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Create unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Get extension safely
            const originalName = file.name;
            const extension = originalName.split('.').pop() || 'jpg';
            const filename = `image-${uniqueSuffix}.${extension}`;

            // Save to public/uploads
            // Note: In production (Vercel/Netlify), local filesystem is not persistent.
            // But for this local app, it's fine.
            const { join } = await import("path");
            const { writeFile, mkdir } = await import("fs/promises");

            const uploadDir = join(process.cwd(), "public", "uploads");

            // Ensure dir exists
            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (e) {
                // Ignore if exists
            }

            const path = join(uploadDir, filename);
            await writeFile(path, buffer);
            imageUrl = `/uploads/${filename}`;
        } else {
            // Fallback to imageUrl string if provided (legacy support or text input)
            const imageUrlStr = formData.get("imageUrl") as string;
            if (imageUrlStr) imageUrl = imageUrlStr;
        }

        const creator = formData.get("creator") as string; // Get creator from form input

        const newManga = await prisma.manga.create({
            data: {
                title,
                imageUrl,
                link,
                releaseDay: releaseInterval ? null : releaseDay, // If interval logic, day is null
                releaseTime,
                releaseInterval,
                nextReleaseDate,
                status: "WAITING", // Default
                creator: creator || null,
            }
        });

        return NextResponse.json(newManga);
    } catch (error) {
        console.error("Failed to create manga:", error);
        return NextResponse.json({ error: "Failed to create manga" }, { status: 500 });
    }
}
