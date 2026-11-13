
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request } from "express";
import prisma from "../../../shared/prisma";
import { optimizeAndSaveImage } from "../../../utiles/imageOptimizer";
import { generateUniqueSlug } from "../../../utiles/generateSlug";
import { Prisma, UserRole } from "@prisma/client";
import { IOptions, paginationHelper } from "../../../utiles/paginationHelper";
import { userSearchableFields } from "./user.constant";
const createCustomer = async (req: Request & { file?: Express.Multer.File }) => {
    const { name, email, password } = req.body;

    // ===== Generate slug =====
    const slug = name ? await generateUniqueSlug(name.trim()) : `user-${crypto.randomBytes(6).toString("hex")}`;
    let avatarUrl: string | null = null;

    if (req.file) {
        const userFolder = `users/${slug}`;
        const filename = await optimizeAndSaveImage(req.file, userFolder);
        avatarUrl = `/uploads/${userFolder}/${filename}`;
    }


    // ===== Hash password =====
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ===== Prisma Transaction =====
    const result = await prisma.$transaction(async (tx) => {
        // 1 Create User
        const user = await tx.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                avatar: avatarUrl,
                role: UserRole.CUSTOMER,
            },
        });

        // 2 Create Auth Provider (Credentials)
        await tx.authProvider.create({
            data: {
                provider: "CREDENTIALS",
                password: hashedPassword,
                userId: user.id,
            },
        });

        // 3 Create Customer Profile
        const customer = await tx.customer.create({
            data: {
                userId: user.id,
                name,
                email,
                avatar: avatarUrl,
                password: hashedPassword,
            },
        });

        return customer;
    });

    return result;
};

const getAllFromDB = async (params: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options)
    const { searchTerm, ...filterData } = params;

    const andConditions: Prisma.UserWhereInput[] = [];

    if (searchTerm) {
        andConditions.push({
            OR: userSearchableFields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        })
    }

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map(key => ({
                [key]: {
                    equals: (filterData as any)[key]
                }
            }))
        })
    }

    const whereConditions: Prisma.UserWhereInput = andConditions.length > 0 ? {
        AND: andConditions
    } : {}

    const result = await prisma.user.findMany({
        skip,
        take: limit,

        where: whereConditions,
        orderBy: {
            [sortBy]: sortOrder
        }
    });

    const total = await prisma.user.count({
        where: whereConditions
    });
    return {
        meta: {
            page,
            limit,
            total
        },
        data: result
    };
}


const createAdmin = async (req: Request & { file?: Express.Multer.File }) => {
    const { name, email, password , phone} = req.body;

    // ===== Generate slug =====
    const slug = name ? await generateUniqueSlug(name.trim()) : `user-${crypto.randomBytes(6).toString("hex")}`;
    let avatarUrl: string | null = null;

    if (req.file) {
        const userFolder = `users/${slug}`;
        const filename = await optimizeAndSaveImage(req.file, userFolder);
        avatarUrl = `/uploads/${userFolder}/${filename}`;
    }


    // ===== Hash password =====
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ===== Prisma Transaction =====
    const result = await prisma.$transaction(async (tx) => {
        // 1 Create User
        const user = await tx.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                avatar: avatarUrl,
                role: UserRole.ADMIN,
            },
        });


        // 3 Create Admin Profile
        const admin = await tx.admin.create({
            data: {
                userId: user.id,
                name,
                email,
                phone,
                avatar: avatarUrl,
                password: hashedPassword,
            },
        });

        return admin;
    });

    return result;
};
const createShopManager = async (req: Request & { file?: Express.Multer.File }) => {
    const { name, email, password , phone} = req.body;
    
    // ===== Generate slug =====
    const slug = name ? await generateUniqueSlug(name.trim()) : `user-${crypto.randomBytes(6).toString("hex")}`;
    let avatarUrl: string | null = null;

    if (req.file) {
        const userFolder = `users/${slug}`;
        const filename = await optimizeAndSaveImage(req.file, userFolder);
        avatarUrl = `/uploads/${userFolder}/${filename}`;
    }


    // ===== Hash password =====
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ===== Prisma Transaction =====
    const result = await prisma.$transaction(async (tx) => {
        // 1 Create User
        const user = await tx.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                avatar: avatarUrl,
                role: UserRole.SHOP_MANAGER,
            },
        });


        // 3 Create Shop Manager Profile
        const shopManager = await tx.shopManager.create({
            data: {
                userId: user.id,
                name,
                email,
                phone,
                avatar: avatarUrl,
                password: hashedPassword,
            },
        });

        return shopManager;
    });

    return result;
};

export const UserService = {
    createCustomer,
    getAllFromDB, 
    createAdmin,
    createShopManager
};

