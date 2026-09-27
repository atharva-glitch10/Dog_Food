import { prisma } from '../../utils/prisma.js';
import { hashPassword, comparePassword, generateToken } from '../../utils/crypto.js';
import { AppError } from '../../utils/response.js';
import { invalidateUserCache } from '../../middleware/requireAuth.js';
import { Role } from '@prisma/client';

export class AuthService {
  async register(data: { email: string; password: string; name: string; role?: Role; bio?: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: Role.PARTICIPANT, // never trust a client-supplied role
        bio: data.bio || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    // Store active session in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return { user, token };
  }

  async login(data: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('This account has been deactivated. Please contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        expiresAt,
      },
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    return { user: userProfile, token };
  }

  async logout(token?: string, userId?: string) {
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    // Evict the cached user profile so the next request (if any)
    // with a fresh session sees up-to-date data.
    if (userId) invalidateUserCache(userId);
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teamMembers: {
          include: {
            team: {
              include: {
                event: {
                  select: { id: true, name: true, slug: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  async updateProfile(userId: string, data: { name?: string; bio?: string; avatarUrl?: string }) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    // Evict the stale cache entry so the next request picks up the new profile.
    invalidateUserCache(userId);

    return updated;
  }
}

export const authService = new AuthService();
