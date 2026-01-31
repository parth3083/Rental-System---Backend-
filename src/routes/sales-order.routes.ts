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
router.patch(
  '/invoice/:invoiceId/status',
  authMiddleware,
  roleMiddleware('VENDOR'),
  salesOrderController.updateInvoiceStatus
);

// Route to create a new sales order
router.post(
  '/',
  authMiddleware,
  roleMiddleware('CUSTOMER'),
  salesOrderController.createOrder
);

// Route to update sales order status
router.patch(
  '/:orderId/status',
  authMiddleware,
  roleMiddleware('VENDOR'),
  salesOrderController.updateOrderStatus
);

export default router;
