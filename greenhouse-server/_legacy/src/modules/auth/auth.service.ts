import { UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import AppError from "../../middlewares/AppError";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../utiles/jwtHelper";
import config from "../../../config";
import { Secret } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendEmail } from "../../../utiles/sendEmail";
import ApiError from "../../errors/ApiError";

const login = async (payload: { email: string, password: string }) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: UserStatus.ACTIVE
        }
    })

    if (!user.password) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Password is not set!")
    }

    const isCorrectPassword = await bcrypt.compare(payload.password, user.password);
    if (!isCorrectPassword) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Password is incorrect!")
    }

    const accessToken = jwtHelper.generateToken(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        config.JWT_SECRET as Secret,
        config.ACCESS_TOKEN_EXPIRY as string
    );

    const refreshToken = jwtHelper.generateToken(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        config.REFRESH_TOKEN_SECRET as Secret,
        config.REFRESH_TOKEN_EXPIRY as string
    );


    return {
        accessToken,
        refreshToken,
        needPasswordChange: user.needPasswordChange
    }
}

const refreshToken = async (token: string) => {
    let decodedData;
    try {
        decodedData = jwtHelper.verifyToken(token, config.REFRESH_TOKEN_SECRET as Secret);
    }
    catch (err) {
        throw new Error("You are not authorized!")
    }

    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
            status: UserStatus.ACTIVE
        }
    });

    const accessToken = jwtHelper.generateToken({
        email: userData.email,
        role: userData.role
    },
        config.JWT_SECRET as Secret,
        config.ACCESS_TOKEN_EXPIRY as string
    );

    return {
        accessToken,
        needPasswordChange: userData.needPasswordChange
    };

};

const forgotPassword = async (payload: { email: string }) => {
    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: UserStatus.ACTIVE
        }
    });
    if (!userData.email) {
        throw new AppError(StatusCodes.NOT_FOUND, "User email not found");
    }
    const resetPassToken = jwtHelper.generateToken(
        { email: userData.email!, role: userData.role },
        config.RESET_PASS_SECRET as Secret,
        config.RESET_PASS_TOKEN_EXPIRES_IN as string
    );

    const resetPassLink =
        `${config.RESET_PASS_LINK}?userId=${userData.id}&token=${resetPassToken}`;


    await sendEmail({
        to: userData.email,
        subject: "Reset Your Password | Colourrose",
        templateName: "forgotPassword",
        templateData: {
            name: userData.name ?? "Valued Customer",
            resetLink: resetPassLink,
            year: new Date().getFullYear(),
        },
    });

};


const resetPassword = async (token: string | null, payload: { email?: string, password: string }, user?: { email: string }) => {
    let userEmail: string;

    // Case 1: Token-based reset (from forgot password email)
    if (token) {
        const decodedToken = jwtHelper.verifyToken(token, config.RESET_PASS_SECRET as Secret)

        if (!decodedToken) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Invalid or expired reset token!")
        }

        // Verify email from token matches the email in payload
        if (payload.email && decodedToken.email !== payload.email) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Email mismatch! Invalid reset request.")
        }

        userEmail = decodedToken.email;
    }
    // Case 2: Authenticated user with needPasswordChange (newly created admin/doctor)
    else if (user && user.email) {
        
        const authenticatedUser = await prisma.user.findUniqueOrThrow({
            where: {
                email: user.email,
                status: UserStatus.ACTIVE
            }
        });

        // Verify user actually needs password change
        if (!authenticatedUser.needPasswordChange) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "You don't need to reset your password. Use change password instead.")
        }

        userEmail = user.email;
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid request. Either provide a valid token or be authenticated.")
    }

    // hash password
    const password = await bcrypt.hash(payload.password, Number(config.BCRYPT_SALT_ROUNDS));

    // update into database
    await prisma.user.update({
        where: {
            email: userEmail
        },
        data: {
            password,
            needPasswordChange: false
        }
    })
};
const getMe = async (session: any) => {
    const accessToken = session.accessToken;
    const decodedData = jwtHelper.verifyToken(accessToken, config.JWT_SECRET as Secret);

    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
            status: UserStatus.ACTIVE
        }
    })

    const { id, email, role, needPasswordChange, status } = userData;

    return {
        id,
        email,
        role,
        needPasswordChange,
        status
    }

}

const changePassword = async (user: any, payload: any) => {
    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: user.email,
            status: UserStatus.ACTIVE
        }
    });

    if (!userData.password) {
        throw new Error("User password not found!");
    }
    if (!userData.email) {
        throw new Error("User email not found");
    }

    const isCorrectPassword = await bcrypt.compare(
        payload.oldPassword,
        userData.password
    );

    if (!isCorrectPassword) {
        throw new Error("Password incorrect!");
    }

    const hashedPassword = await bcrypt.hash(
        payload.newPassword,
        Number(config.BCRYPT_SALT_ROUNDS)
    );

    await prisma.user.update({
        where: {
            email: userData.email
        },
        data: {
            password: hashedPassword,
            needPasswordChange: false
        }
    });

    return {
        message: "Password changed successfully!"
    };
};


export const AuthService = {
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
    getMe,
    changePassword
};

