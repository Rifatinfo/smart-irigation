import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

const generateToken = (payload: object, secret: Secret, expiresIn: string) =>
  jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn } as SignOptions);

const verifyToken = (token: string, secret: Secret) =>
  jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;

export const jwtHelper = { generateToken, verifyToken };
