import { Router } from 'express';
import { prisma } from './db.js';

const PHONE = /^\+?\d{10,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

export function validate(body) {
  body ??= {};
  const data = {
    name: text(body.name),
    phoneNumber: text(body.phoneNumber).replace(/[\s()-]/g, ''),
    email: text(body.email).toLowerCase(),
    businessCategory: text(body.businessCategory),
  };

  const errors = {};
  if (!data.name) errors.name = 'Name is required.';
  if (!data.phoneNumber) errors.phoneNumber = 'Phone number is required.';
  else if (!PHONE.test(data.phoneNumber))
    errors.phoneNumber = 'Enter a valid phone number: 10-15 digits, optionally starting with +.';
  if (!data.email) errors.email = 'Email is required.';
  else if (!EMAIL.test(data.email)) errors.email = 'Enter a valid email address, like name@company.com.';
  if (!data.businessCategory) errors.businessCategory = 'Business category is required.';

  return { data, errors };
}

export const router = Router();

router.post('/', async (req, res) => {
  const { data, errors } = validate(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Validation failed.', fields: errors });
  }
  res.status(201).json(await prisma.sellerInterest.create({ data }));
});

// ponytail: no auth and unpaginated; testing only. Add auth + take/skip when the admin area exists.
router.get('/', async (req, res) => {
  res.json(await prisma.sellerInterest.findMany({ orderBy: { createdAt: 'desc' } }));
});
