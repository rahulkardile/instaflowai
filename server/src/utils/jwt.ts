import jwt from "jsonwebtoken";
import { AuthUser } from "../types/userTypes";

export class JwtService {
  static generateToken(payload: AuthUser) {
    const secret = this.getSecret();

    return jwt.sign(payload, secret, {
      expiresIn: "30d",
    });
  }

  static verifyToken(token: string) {
    return jwt.verify(token, this.getSecret()) as AuthUser;
  }

  private static getSecret() {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    return process.env.JWT_SECRET;
  }
}
