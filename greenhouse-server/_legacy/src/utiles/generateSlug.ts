import slugify from "slugify";
import prisma from "../shared/prisma"; // adjust path

export const generateUniqueSlug = async (
    name: string
): Promise<string> => {
    const baseSlug = slugify(name, {
        lower: true,
        strict: true, // removes special chars
        trim: true,
    });

    // Find all similar slugs
    const existingSlugs = await prisma.product.findMany({
        where: {
            slug: {
                startsWith: baseSlug,
            },
        },
        select: { slug: true },
    });

    if (existingSlugs.length === 0) {
        return baseSlug;
    }
    const numbers = existingSlugs
        .map((p) => {
            const match = p.slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
            return match ? Number(match[1]) : null;
        })
        .filter((n): n is number => n !== null);
    const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `${baseSlug}-${nextNumber}`;
};
