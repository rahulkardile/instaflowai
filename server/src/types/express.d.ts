import { AuthUser } from "./userTypes"

declare namespace Express {
  interface Request {
    user?: AuthUser;
  }
}

export {};