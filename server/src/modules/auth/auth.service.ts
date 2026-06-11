import { User } from "../../models/User";
import { JwtService } from "../../utils/jwt";
import { AuthProvider, UserRole } from "../../types/userTypes";

export class AuthService {
  async loginWithGoogle(profile: { id: string; email: string; name: string; avatar?: string; }) {
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

    const token = JwtService.generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    return {
      token,
      user,
    };
  }

  async getCurrentUser(userId: string) {
    return User.findById(userId).select("-__v");
  }
}
