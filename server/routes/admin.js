import express from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, generateTempPassword } from '../lib/auth.js';
// Email functionality removed - passwords will be returned in response
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { inviteEmployeeSchema, approveEmployeeSchema } from '../validation/schemas.js';

const router = express.Router();

// POST /admin/invite-employee
router.post('/invite-employee', authenticateToken, requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const { email, name } = inviteEmployeeSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.employeeInvitation.findUnique({
      where: { email }
    });

    if (existingInvitation && existingInvitation.status !== 'EXPIRED') {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const hashedTempPassword = await hashPassword(tempPassword);

    // Create user with temporary password (active for login but restricted access)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedTempPassword,
        role: 'EMPLOYEE',
        isFirstLogin: true,
        isActive: true, // User can login but access is controlled by onboarding status
      }
    });

    // Create invitation record
    const invitation = await prisma.employeeInvitation.create({
      data: {
        email,
        tempPassword: hashedTempPassword,
        invitedById: req.user.id,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    // Email functionality removed - return password in response
    console.log(`Temporary password for ${email}: ${tempPassword}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'INVITE_EMPLOYEE',
        entity: 'User',
        entityId: user.id,
        newValues: { email, name, invitedBy: req.user.id },
      }
    });

    res.status(201).json({
      message: 'Employee invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        sentAt: invitation.sentAt,
      },
      // For testing purposes - show temp password
      tempPassword: tempPassword
    });

  } catch (error) {
    console.error('Error inviting employee:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to invite employee' });
  }
});

// GET /admin/pending-approvals
router.get('/pending-approvals', authenticateToken, requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const pendingOnboardings = await prisma.employeeOnboarding.findMany({
      where: {
        status: 'SUBMITTED'
      },
      include: {
        user: {
          include: {
            profile: true,
            documents: true,
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    res.json({
      pendingApprovals: pendingOnboardings.map(onboarding => ({
        id: onboarding.id,
        user: {
          id: onboarding.user.id,
          email: onboarding.user.email,
          name: onboarding.user.name,
          profile: onboarding.user.profile,
          documents: onboarding.user.documents,
        },
        submittedAt: onboarding.submittedAt,
        status: onboarding.status,
      }))
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// PUT /admin/approve-employee/:id
router.put('/approve-employee/:id', authenticateToken, requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, notes, rejectionReason } = approveEmployeeSchema.parse(req.body);

    const onboarding = await prisma.employeeOnboarding.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!onboarding) {
      return res.status(404).json({ error: 'Onboarding request not found' });
    }

    if (onboarding.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Onboarding request is not in submitted status' });
    }

    // Update onboarding status
    const updatedOnboarding = await prisma.employeeOnboarding.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedAt: approved ? new Date() : null,
        rejectedAt: approved ? null : new Date(),
        approvedById: req.user.id,
        notes,
        rejectionReason: approved ? null : rejectionReason,
      }
    });

    // If approved, activate the user account
    if (approved) {
      await prisma.user.update({
        where: { id: onboarding.userId },
        data: {
          isActive: true,
          isFirstLogin: false,
        }
      });
    }

    // Email functionality removed - log approval status
    console.log(`Employee ${onboarding.user.email} ${approved ? 'approved' : 'rejected'}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: approved ? 'APPROVE_EMPLOYEE' : 'REJECT_EMPLOYEE',
        entity: 'EmployeeOnboarding',
        entityId: id,
        newValues: { approved, notes, rejectionReason, approvedBy: req.user.id },
      }
    });

    res.json({
      message: `Employee ${approved ? 'approved' : 'rejected'} successfully`,
      onboarding: updatedOnboarding,
    });

  } catch (error) {
    console.error('Error approving employee:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

// GET /admin/invitations
router.get('/invitations', authenticateToken, requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const invitations = await prisma.employeeInvitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true }
        },
        user: {
          select: { id: true, name: true, email: true, isActive: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ invitations });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

export default router;