import express from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { employeeProfileSchema } from '../validation/schemas.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Word documents are allowed'));
    }
  }
});

// PUT /employee/complete-profile
router.put('/complete-profile', authenticateToken, async (req, res) => {
  try {
    const profileData = employeeProfileSchema.parse(req.body);

    // Check if user has an onboarding record
    const onboarding = await prisma.employeeOnboarding.findUnique({
      where: { userId: req.user.id }
    });

    if (!onboarding) {
      return res.status(400).json({ error: 'No onboarding record found' });
    }

    if (onboarding.status === 'APPROVED') {
      return res.status(400).json({ error: 'Profile has already been approved' });
    }

    // Convert date strings to Date objects
    const processedData = {
      ...profileData,
      dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null,
      joinDate: profileData.joinDate ? new Date(profileData.joinDate) : null,
      currentAddress: profileData.currentAddress,
      permanentAddress: profileData.permanentAddress,
      emergencyContact: profileData.emergencyContact,
      bankDetails: profileData.bankDetails,
    };

    // Update or create employee profile
    const profile = await prisma.employeeProfile.upsert({
      where: { userId: req.user.id },
      update: processedData,
      create: {
        userId: req.user.id,
        employeeId: `EMP${Date.now()}`,
        ...processedData,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PROFILE',
        entity: 'EmployeeProfile',
        entityId: profile.id,
        newValues: profileData,
      }
    });

    res.json({
      message: 'Profile updated successfully',
      profile,
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /employee/upload-document
router.post('/upload-document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type } = req.body;
    
    if (!type || !['ID_DOCUMENT', 'RESUME', 'CERTIFICATE', 'CONTRACT', 'BANK_STATEMENT', 'OTHER'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Save document record
    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        type,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPLOAD_DOCUMENT',
        entity: 'Document',
        entityId: document.id,
        newValues: { type, fileName: req.file.originalname },
      }
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        type: document.type,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt,
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// POST /employee/submit-onboarding
router.post('/submit-onboarding', authenticateToken, async (req, res) => {
  try {
    // Check if user has completed profile
    const profile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!profile || !profile.firstName || !profile.lastName) {
      return res.status(400).json({ error: 'Please complete your profile first' });
    }

    // Check if user has uploaded required documents
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id }
    });

    const requiredDocTypes = ['ID_DOCUMENT', 'RESUME'];
    const uploadedDocTypes = documents.map(doc => doc.type);
    const missingDocs = requiredDocTypes.filter(type => !uploadedDocTypes.includes(type));

    if (missingDocs.length > 0) {
      return res.status(400).json({ 
        error: 'Please upload all required documents', 
        missingDocuments: missingDocs 
      });
    }

    // Create or update onboarding status
    const onboarding = await prisma.employeeOnboarding.upsert({
      where: { userId: req.user.id },
      update: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SUBMIT_ONBOARDING',
        entity: 'EmployeeOnboarding',
        entityId: onboarding.id,
        newValues: { status: 'SUBMITTED' },
      }
    });

    res.json({
      message: 'Onboarding submitted successfully',
      onboarding,
    });

  } catch (error) {
    console.error('Error submitting onboarding:', error);
    res.status(500).json({ error: 'Failed to submit onboarding' });
  }
});

// GET /employee/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        documents: true,
        onboarding: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /employee/documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json({ documents });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;