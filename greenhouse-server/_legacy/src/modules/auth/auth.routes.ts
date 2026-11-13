import express, { NextFunction, Request, Response } from "express";
import { AuthController } from "./auth.controller";
import passport from "passport";
import config from "../../../config";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
const router = express.Router();

router.post("/login", AuthController.login);
//======================= The trigger route =======================//
router.get(
  "/google",
  (req, res, next) => {

    // Capture the target frontend page if passed as a query param
    const state = req.query.redirect as string || "/";
    passport.authenticate("google", {
      scope: ["profile", "email"], //========== Explicitly define scopes here ==========//
      state: state,                //========== Pass state to maintain redirect URL ==========//
      session: false,
    })(req, res, next);
  }
);

//======================= The callback route =======================//
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${config.FRONTEND_URL}/?error=auth_failed`,
    session: false,
  }),
  AuthController.googleCallbackController
);

router.post(
  '/refresh-token',
  AuthController.refreshToken
)

router.post(
  '/change-password',
  auth(
    UserRole.ADMIN,
    UserRole.CUSTOMER,
    UserRole.SHOP_MANAGER
  ),
  AuthController.changePassword
);

router.post('/forgot-password', AuthController.forgotPassword);

router.post(
  '/reset-password',
  (req: Request, res: Response, next: NextFunction) => {

    //user is resetting password without token and logged in newly created admin or doctor
    if (!req.headers.authorization && req.cookies.accessToken) {
      
      auth(
        UserRole.ADMIN,
        UserRole.CUSTOMER,
        UserRole.SHOP_MANAGER
      )(req, res, next);
    } else {
      //user is resetting password via email link with token
      next();
    }
  },
  AuthController.resetPassword
)
router.get(
  "/me",
  AuthController.getMe
)

export const AuthRoutes = router;
