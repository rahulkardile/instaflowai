import { User } from "../../models/User";
import { JwtService } from "../../utils/jwt";
import { AuthProvider, UserRole } from "../../types/userTypes";
import bcrypt from "bcrypt";

type AuthPayload = {
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  instagramConnected: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  id: string;
};

export class AuthService {
  private async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(password, salt);
  }

  async register(input: any) {
    switch (input.provider) {
      case AuthProvider.LOCAL:
        return this.registerWithPassword(input);

      case AuthProvider.GOOGLE:
        return this.registerWithGoogle(input);

      default:
        throw new Error("Unsupported authentication provider");
    }
  }

  private buildToken(user: { id: string; email: string; role: UserRole }) {
    return JwtService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private sanitizeUser(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    instagramConnected: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): AuthPayload {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      instagramConnected: user.instagramConnected,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async registerWithPassword(input: {
    name: string;
    email: string;
    password: string;
  }) {
    const email = input.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await this.hashPassword(input.password);

    const user = await User.create({
      name: input.name.trim(),
      email,

      passwordHash,

      provider: AuthProvider.LOCAL,
      providerId: email,

      role: UserRole.USER,

      emailVerified: false,

      lastLoginAt: new Date(),
    });

    return {
      token: this.buildToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async registerWithGoogle(input: {
    providerId: string;
    name: string;
    email: string;
    avatar?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    locale?: string | null;
    emailVerified?: boolean;
  }) {
    const email = input.email.toLowerCase().trim();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: input.name,
        email,
        provider: AuthProvider.GOOGLE,
        providerId: input.providerId,
        role: UserRole.USER,
        avatar: input.avatar ?? null,
        givenName: input.givenName ?? null,
        familyName: input.familyName ?? null,
        locale: input.locale ?? null,
        emailVerified: input.emailVerified ?? false,
        passwordHash: null,
        instagramConnected: false,
        isActive: true,
        lastLoginAt: new Date(),
      });
    } else {
      user.name = input.name;
      user.provider = AuthProvider.GOOGLE;
      user.providerId = input.providerId;
      user.avatar = input.avatar ?? user.avatar;
      user.givenName = input.givenName ?? user.givenName;
      user.familyName = input.familyName ?? user.familyName;
      user.locale = input.locale ?? user.locale;
      user.emailVerified = input.emailVerified ?? user.emailVerified;
      user.lastLoginAt = new Date();

      await user.save();
    }

    return {
      token: this.buildToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async loginWithPassword(input: { email: string; password: string }) {
    const email = input.email.toLowerCase().trim();
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user?.passwordHash) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("This account has been disabled");
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new Error("Invalid email or password");
    }

    user.lastLoginAt = new Date();
    await user.save();

    return {
      token: this.buildToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async loginWithGoogle(profile: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await User.findOne({
      provider: AuthProvider.GOOGLE,
      providerId: profile.id,
    });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        provider: AuthProvider.GOOGLE,
        providerId: profile.id,
        role: UserRole.USER,
      });
    }
    user.lastLoginAt = new Date();
    await user.save();

    return {
      token: this.buildToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async getCurrentUser(userId: string) {
    const user = await User.findById(userId);
    if (!user?.isActive) {
      return null;
    }
    return this.sanitizeUser(user);
  }
}
