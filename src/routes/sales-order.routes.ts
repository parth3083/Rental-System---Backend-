import { Router } from 'express';
import { salesOrderController } from '../controllers/sales-order.controller.js';
import {
  authMiddleware,
  roleMiddleware,
} from '../middleware/auth.middleware.js';

const router: Router = Router();

// Route to get sales orders for vendors
// Verifies token and checks if role is VENDOR
router.get(
  '/vendor',
  authMiddleware,
  roleMiddleware('VENDOR'),
  salesOrderController.getVendorOrders
);
router.post(
  '/invoice',
  authMiddleware,
  roleMiddleware('VENDOR'),
  salesOrderController.createInvoice
);

export default router;
