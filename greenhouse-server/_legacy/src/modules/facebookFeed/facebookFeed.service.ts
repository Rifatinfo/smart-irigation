// src/app/modules/facebookFeed/facebookFeed.service.ts
import {  StockStatus } from "@prisma/client";
import { create } from "xmlbuilder2";
import { CreateProductInput } from "../product/product.interface";
import prisma from "../../../shared/prisma";



/**
 * Fetch all active products from the database
 */
export const getActiveProducts = async (): Promise<CreateProductInput[]> => {
    const products = await prisma.product.findMany({
        where: { stockStatus: StockStatus.IN_STOCK },
        include: { variants: true, images: true },
    });

    // Map null fields to undefined for TypeScript
    const mapped: CreateProductInput[] = products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug ?? undefined,
        sku: p.sku,
        regularPrice: p.regularPrice ?? 0,
        salePrice: p.salePrice ?? undefined,
        stockQuantity: p.stockQuantity,
        stockStatus: p.stockStatus,
        shortDescription: p.shortDescription ?? undefined,
        fullDescription: p.fullDescription ?? undefined,
        variants: p.variants.map(v => ({
            color: v.color ?? undefined,
            size: v.size ?? undefined,
            quantity: v.quantity
        })),
        images: p.images.map(i => i.url),
        categories: undefined,
        subCategories: undefined,
        tags: undefined,
        additionalInformation: undefined,
    }));

    return mapped;
};

/**
 * Build XML feed from product array
 */
export const buildXMLFeed = async (products: CreateProductInput[]): Promise<string> => {
    const feed = create({ version: "1.0", encoding: "UTF-8" })
        .ele("rss", { "xmlns:g": "http://base.google.com/ns/1.0", version: "2.0" })
        .ele("channel")
            .ele("title").txt("Colourrose").up()
            .ele("link").txt("https://colourrose.shop").up()
            .ele("description").txt("Custom E-commerce Product Feed").up();

    products.forEach(product => {
        const variants = product.variants ?? [{ quantity: product.stockQuantity }];

        variants.forEach(variant => {
            const item = feed.ele("item");
            item.ele("g:id").txt(product.sku + (variant.color ?? "") + (variant.size ?? ""));
            item.ele("g:title").txt(product.name);
            item.ele("g:description").txt((product.fullDescription ?? product.shortDescription ?? "").substring(0, 5000));
            item.ele("g:link").txt(`${process.env.FRONTEND_URL}/men/product/${product.slug ?? ""}`);

            if (product.images && product.images.length > 0) {
                item.ele("g:image_link").txt(`${process.env.BACKEND_URL}${product.images[0]}`);
                product.images.slice(1).forEach(img => {
                    item.ele("g:additional_image_link").txt(`${process.env.BACKEND_URL}${img}`);
                });
            }

            item.ele("g:brand").txt("Colourrose");
            item.ele("g:condition").txt("new");
            item.ele("g:availability").txt((variant.quantity ?? 0) > 0 ? "in stock" : "out of stock");
            item.ele("g:price").txt(`${product.salePrice ?? product.regularPrice ?? 0} BDT`);
            item.ele("g:color").txt(variant.color ?? "N/A");
            item.ele("g:size").txt(variant.size ?? "N/A");
            item.ele("g:item_group_id").txt(product.sku);
        });
    });

    return feed.end({ prettyPrint: true });
};