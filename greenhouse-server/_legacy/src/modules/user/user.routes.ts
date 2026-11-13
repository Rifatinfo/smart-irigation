import express from "express";
import { fileUploader } from "../../../utiles/fileUploader";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post(
    "/create",
    fileUploader.singleUpload("file"),
    (req, _res, next) => {
        try {
            if (!req.body?.data) {
                throw new Error("Customer data missing");
            }

            const parsed = JSON.parse(req.body.data);
            req.body = UserValidation.createUserValidationSchema.parse(parsed);

            next();
        } catch (error) {
            next(error);
        }
    },
    UserController.createCustomer
);

/* ===============================================
 ====================== Admin Created ============
 ============================================== */

router.post(
    "/create-admin",
    fileUploader.singleUpload("file"),
    (req, _res, next) => {
        try {
            if (!req.body?.data) {
                throw new Error("Admin data missing");
            }

            const parsed = JSON.parse(req.body.data);
            req.body = UserValidation.createAdminValidationSchema.parse(parsed);

            next();
        } catch (error) {
            next(error);
        }
    },
    UserController.createAdmin
);

/* ===============================================
 ====================== Shop Manager  ============
 ============================================== */

router.post(
    "/create-shop-manager",
    fileUploader.singleUpload("file"),
    (req, _res, next) => {
        try {
            if (!req.body?.data) {
                throw new Error("Shop Manager data missing");
            }

            const parsed = JSON.parse(req.body.data);
            req.body = UserValidation.createAdminValidationSchema.parse(parsed);

            next();
        } catch (error) {
            next(error);
        }
    },
    UserController.createShopManager
);

router.get("/", auth(UserRole.ADMIN), UserController.getAllFromDB);

export const UserRoutes = router;