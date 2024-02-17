import 'dotenv/config';

export const BCRYPT_SALT = process.env.BCRYPT_SALT || '$2b$12$W_DO_NOT_USE_THIS_VALUE';
export const JWT_SECRET = process.env.JWT_SECRET || 'DO_NOT_USE_THIS_VALUE';

export const NOT_FOUND_VALUE = null;
export const FORBIDDEN_VALUE = false;
