import { z } from 'zod';

export const inviteEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const firstTimeLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  tempPassword: z.string().min(1, 'Temporary password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const employeeProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER']),
  nationality: z.string().min(1, 'Nationality is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  personalEmail: z.string().email('Invalid personal email').optional(),
  alternatePhone: z.string().optional(),
  
  currentAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  
  permanentAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    email: z.string().email('Invalid email').optional(),
  }),
  

  
  bankDetails: z.object({
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    ifscCode: z.string().min(1, 'IFSC code is required'),
  }),
});

export const approveEmployeeSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});