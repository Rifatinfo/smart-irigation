

import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { AuthType, UserRole } from "@prisma/client";
import prisma from "../shared/prisma";
import config from "../config";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID as string,
      clientSecret: config.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${config.BACKEND_URL}/api/v1/auth/google/callback`,
      scope: ["profile", "email"], 
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, { message: "No email found from Google" });
        }

        // 1 Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email },
          include: { auths: true },
        });

        // 2 Create user if not exists
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              role: UserRole.CUSTOMER,
              auths: {
                create: {
                  provider: AuthType.GOOGLE,
                  providerId: profile.id,
                },
              },
            },
            include: { auths: true },
          });
        }

        return done(null, user);
      } catch (error) {
        console.error("Google Strategy Error:", error);
        return done(error as Error);
      }
    }
  )
);


passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
})
