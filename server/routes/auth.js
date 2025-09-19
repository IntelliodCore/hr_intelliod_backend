import express from 'express';
import { prisma } from '../lib/prisma.js';
import { comparePassword, hashPassword, generateToken } from '../lib/auth.js';
import { firstTimeLoginSchema } from '../validation/schemas.js';

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
      isFirstLogin: user.isFirstLogin,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/first-time-login
router.post('/first-time-login', async (req, res) => {
  try {
    const { email, tempPassword, newPassword } = firstTimeLoginSchema.parse(req.body);

    // Find user and invitation
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        invitation: true,
        profile: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isFirstLogin) {
      return res.status(400).json({ error: 'User has already completed first-time login' });
    }

    // Verify temporary password
    const isValidTempPassword = await comparePassword(tempPassword, user.password);
    if (!isValidTempPassword) {
      return res.status(401).json({ error: 'Invalid temporary password' });
    }

    // Check if invitation is still valid
    if (user.invitation && user.invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update user password and first login status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        isFirstLogin: false,
      },
      include: { profile: true }
    });

    // Update invitation status
    if (user.invitation) {
      await prisma.employeeInvitation.update({
        where: { id: user.invitation.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      });
    }

    // Create employee profile if it doesn't exist
    if (!user.profile) {
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          employeeId: `EMP${Date.now()}`, // Generate unique employee ID
        }
      });
    }

    // Create onboarding record
    await prisma.employeeOnboarding.create({
      data: {
        userId: user.id,
        status: 'PENDING',
      }
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FIRST_TIME_LOGIN',
        entity: 'User',
        entityId: user.id,
        newValues: { passwordChanged: true },
      }
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'Password changed successfully',
      token,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('First-time login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'First-time login failed' });
  }
});

export default router;