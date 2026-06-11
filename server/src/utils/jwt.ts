import jwt from "jsonwebtoken";
import { AuthUser } from "../types/userTypes";

export class JwtService {
  static generateToken(payload: AuthUser) {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });
  }

  static verifyToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
  }
}
