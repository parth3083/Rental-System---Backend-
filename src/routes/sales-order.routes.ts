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

// Route to get sales orders for customers
router.get(
  '/customer',
  authMiddleware,
  roleMiddleware('CUSTOMER'),
  salesOrderController.getCustomerOrders
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

// Route to get list of invoices for vendor
router.get(
  '/invoice',
  authMiddleware,
  roleMiddleware('VENDOR'),
  salesOrderController.getInvoices
);

// Route to get single invoice by ID
router.get(
  '/invoice/:invoiceId',
  authMiddleware,
  roleMiddleware('VENDOR'),
  salesOrderController.getInvoiceById
);

// Route to create a new sales order
router.post(
  '/',
  authMiddleware,
  roleMiddleware('CUSTOMER'),
  salesOrderController.createOrder
);

// Route to get single order by ID
router.get('/:orderId', authMiddleware, salesOrderController.getOrderById);

// Route to update sales order status
router.patch(
  '/:orderId/status',
  authMiddleware,
  roleMiddleware('VENDOR', 'CUSTOMER'),
  salesOrderController.updateOrderStatus
);

// Route to accept quotation
router.post(
  '/accept/:orderId',
  authMiddleware,
  roleMiddleware('CUSTOMER'),
  salesOrderController.acceptQuotation
);

// Route to get return calculation summary
router.get(
  '/:orderId/return-summary',
  authMiddleware,
  roleMiddleware('VENDOR'), // Assuming Vendor performs return check
  salesOrderController.calculateReturn
);

export default router;
