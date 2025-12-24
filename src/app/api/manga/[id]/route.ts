import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = parseInt(params.id);
        const contentType = request.headers.get("content-type") || "";

        let data: any = {};

        if (contentType.includes("application/json")) {
            const body = await request.json();
            const { id: _, ...rest } = body;
            data = rest;
        } else if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const title = formData.get("title") as string;
            const link = formData.get("link") as string;
            const releaseDay = formData.get("releaseDay") as string;
            const releaseTime = formData.get("releaseTime") as string;
            const status = formData.get("status") as string;
            const file = formData.get("image") as File | null;
            const existingImageUrl = formData.get("imageUrl") as string;

            let imageUrl = existingImageUrl;

            if (file && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const originalName = file.name;
                const extension = originalName.split('.').pop() || 'jpg';
                const filename = `image-${uniqueSuffix}.${extension}`;

                const { join } = await import("path");
                const { mkdir } = await import("fs/promises");
                const sharpModule = await import("sharp");
                const sharp = sharpModule.default || sharpModule;

                const uploadDir = join(process.cwd(), "public", "uploads");

                try {
                    await mkdir(uploadDir, { recursive: true });
                } catch (e) {
                    // Ignore
                }

                const path = join(uploadDir, filename);

                await sharp(buffer)
                    .resize(480, 623, { fit: 'fill' })
                    .toFile(path);

                imageUrl = `/uploads/${filename}`;
            }

            if (title) data.title = title;
            if (link) data.link = link;
            const releaseIntervalStr = formData.get("releaseInterval") as string;

            if (releaseIntervalStr) {
                const interval = parseInt(releaseIntervalStr);
                if (!isNaN(interval)) {
                    data.releaseInterval = interval;
                    data.releaseDay = null; // Clear day if interval is used

                    // If switching to interval for the first time or changing it, set next date?
                    // Let's set it if it doesn't exist? Or if explicit change?
                    // For simplicity: If setting interval, ensure nextReleaseDate is valid (e.g. tomorrow/today + interval)
                    // But maybe only if it's null? 
                    // Let's rely on the user to "Reset" to start the cycle if they want, OR set it now.
                    // Better UX: Set it to now + interval.
                    const next = new Date();
                    next.setDate(next.getDate() + interval);
                    data.nextReleaseDate = next;
                }
            } else if (formData.has("releaseInterval") && formData.get("releaseInterval") === "") {
                // Explicitly clearing interval
                data.releaseInterval = null;
                data.nextReleaseDate = null;
            }

            if (title) data.title = title;
            if (link) data.link = link;
            if (releaseDay) {
                data.releaseDay = releaseDay;
                data.releaseInterval = null; // Clear interval if day is set
                data.nextReleaseDate = null;
            }
            if (releaseTime) data.releaseTime = releaseTime;

            if (status) {
                data.status = status;
                // NEXT EPISODE LOGIC:
                // If status is set to WAITING (Reset) AND we have an interval, update the next date.
                if (status === "WAITING") {
                    // We need to check if this manga has an interval.
                    // Since we might not have it in 'data', we might need to fetch it or check if 'data.releaseInterval' is set.
                    // A bit complex because we need the CURRENT interval if not updating it.
                    // Let's do a fetch first if we really need to be precise.
                    // Or, since this is a small app, just fetch the manga first.
                }
            }

            // Only update imageUrl if we processed a new file OR if the key was explicitly sent
            if (file && file.size > 0) {
                data.imageUrl = imageUrl;
            } else if (formData.has("imageUrl")) {
                data.imageUrl = existingImageUrl;
            }
        }

        const updated = await prisma.manga.update({
            where: { id },
            data: data
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("PUT Error:", error);
        return NextResponse.json({ error: "Failed to update manga" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = parseInt(params.id);
        await prisma.manga.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete manga" }, { status: 500 });
    }
}
