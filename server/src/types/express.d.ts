import { AuthUser } from "./userTypes"

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser & { id: string };
    }
  }
}

export {};
