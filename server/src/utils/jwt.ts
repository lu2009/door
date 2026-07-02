import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: string;       // username
  ds: string;        // database_name
  name: string;      // display_name
  registrant: string;
  iat: number;
  exp: number;
}

export function createToken(username: string, databaseName: string, displayName = '', registrant = ''): string {
  return jwt.sign(
    { sub: username, ds: databaseName, name: displayName, registrant },
    config.jwt.secret,
    { expiresIn: `${config.jwt.expirationHours}h` }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}
