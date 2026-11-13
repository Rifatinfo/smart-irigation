import crypto from 'crypto';

export const generateApiKey = () => `ghk_${crypto.randomBytes(24).toString('hex')}`;

export const hashApiKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');

export const apiKeyPrefix = (key: string) => key.slice(0, 8);
