
import { Response } from "express";

type TokenInfo = {
  accessToken: string;
  refreshToken: string;
};

export const setAuthCookie = (res: Response, tokenInfo: TokenInfo) => {
  // Access Token (short-lived)
  res.cookie("accessToken", tokenInfo.accessToken, {
    secure: true,            // HTTPS only
    httpOnly: true,          // not accessible by JS
    sameSite: "none",        // allow cross-site
    domain: ".colourrose.shop",   // allow frontend to read
    path: "/",
    maxAge: 1000 * 60 * 60,  // 1 hour
  });

  // Refresh Token (long-lived)
  res.cookie("refreshToken", tokenInfo.refreshToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    domain: ".colourrose.shop",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
  });
};