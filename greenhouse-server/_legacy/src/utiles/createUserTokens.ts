import config from "../config";
import { jwtHelper } from "./jwtHelper";
import { User } from "@prisma/client";

export const createUserTokens = (user: User) => {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
  };
  
  
  const accessToken = jwtHelper.generateToken(
    payload,
    config.JWT_SECRET as string,
    config.ACCESS_TOKEN_EXPIRY as string
  );

  const refreshToken = jwtHelper.generateToken(
    payload,
    config.REFRESH_TOKEN_SECRET as string,
    config.REFRESH_TOKEN_EXPIRY as string
  );

  return {
    accessToken,
    refreshToken,
  };
};
