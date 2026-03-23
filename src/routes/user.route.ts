import { Router } from 'express';
import { body, param } from 'express-validator';
import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('role').optional().isIn(Object.values(UserRole)),
  body('isActive').optional().isBoolean(),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

// Public routes
router.post('/register', validate(registerValidation), userController.register.bind(userController));
router.post('/login', validate(loginValidation), userController.login.bind(userController));

// Protected routes
router.use(authenticate);

router.get('/me', userController.getMe.bind(userController));
router.patch('/me/password', validate(changePasswordValidation), userController.changePassword.bind(userController));

// Admin routes
router.get('/', authorize(UserRole.ADMIN), userController.getAll.bind(userController));
router.get('/:id', validate(mongoIdValidation), authorize(UserRole.ADMIN), userController.getById.bind(userController));
router.patch('/:id', validate([...mongoIdValidation, ...updateValidation]), userController.update.bind(userController));
router.delete('/:id', validate(mongoIdValidation), authorize(UserRole.ADMIN), userController.delete.bind(userController));

export default router;