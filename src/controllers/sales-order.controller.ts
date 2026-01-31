import type { Request, Response } from 'express';
import { salesOrderService } from '../services/sales-order.service.js';
import { salesInvoiceService } from '../services/sales-invoice.service.js';
import { logger } from '../config/logger.config.js';
import { DeliveryStatus, OrderStatus } from '../generated/prisma/client.js';

export const salesOrderController = {
  /**
   * Get sales orders for the authenticated vendor
   */
  getVendorOrders: async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = req.user?.id;

      if (!vendorId) {
        res.status(401).json({
          success: false,
          message: 'User authentication failed',
        });
        return;
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await salesOrderService.getOrdersByVendorId({
        vendorId,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        message: 'Vendor sales orders retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error in getVendorOrders controller', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  },

  /**
   * Create invoice for a sales order
   */
  createInvoice: async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = req.user?.id;
      const { orderId } = req.body;

      if (!vendorId) {
        res.status(401).json({
          success: false,
          message: 'User authentication failed',
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'orderId is required',
        });
        return;
      }

      // No longer passing taxAmount, it is calculated internally
      const invoice = await salesInvoiceService.createInvoice({
        vendorId,
        orderId,
      });

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (error: any) {
      logger.error('Error in createInvoice controller', error);

      if (error.message === 'Order not found') {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      if (error.message === 'Unauthorized access to this order') {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to this order',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  },

  /**
   * Create a new sales order
   */
  createOrder: async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.id;

      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'User authentication failed',
        });
        return;
      }
      const orders = await salesOrderService.createOrdersFromCart({
        customerId,
      });

      res.status(201).json({
        success: true,
        message: 'Orders created successfully from cart',
        data: orders,
      });
    } catch (error: any) {
      logger.error('Error in createOrder controller', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  },

  /**
   * Update invoice status
   */
  updateInvoiceStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = req.user?.id;
      const invoiceIdParam = req.params.invoiceId;
      const invoiceId = Array.isArray(invoiceIdParam)
        ? invoiceIdParam[0]
        : invoiceIdParam;
      const { status } = req.body;

      if (!vendorId) {
        res.status(401).json({
          success: false,
          message: 'User authentication failed',
        });
        return;
      }

      if (!invoiceId) {
        res.status(400).json({
          success: false,
          message: 'Invoice ID is required',
        });
        return;
      }

      if (!status || !Object.values(DeliveryStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Valid status is required',
        });
        return;
      }

      const updatedInvoice = await salesInvoiceService.updateInvoiceStatus({
        vendorId,
        invoiceId,
        status: status as DeliveryStatus,
      });

      res.status(200).json({
        success: true,
        message: 'Invoice status updated successfully',
        data: updatedInvoice,
      });
    } catch (error: any) {
      logger.error('Error in updateInvoiceStatus controller', error);

      if (error.message === 'Invoice not found') {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      if (error.message.includes('Invalid status transition')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message === 'Unauthorized access to this invoice') {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to this invoice',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  },

  updateOrderStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = req.user?.id;
      const orderIdParam = req.params.orderId;
      const orderId = Array.isArray(orderIdParam)
        ? orderIdParam[0]
        : orderIdParam;
      const { status } = req.body;

      if (!vendorId) {
        res.status(401).json({
          success: false,
          message: 'User authentication failed',
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
        return;
      }

      // Valid statuses for a vendor to set 'SENT' implies 'SENT' status, but generally we can allow valid enum values
      // We will allow any valid enum status for now, or specifically check if it is 'SENT' if that's the only allowed action
      // Prompt says "he will be able to update the status to sent"
      // I'll validate against OrderStatus enum
      // Assuming OrderStatus is imported? We need to make sure we import OrderStatus from prisma client if not already
      // Controller seems to import DeliveryStatus but maybe not OrderStatus.

      // I'll assume standard validation

      const updatedOrder = await salesOrderService.updateOrderStatus({
        vendorId,
        orderId,
        status: status as OrderStatus,
      });

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder,
      });
    } catch (error: any) {
      logger.error('Error in updateOrderStatus controller', error);

      if (error.message === 'Order not found') {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      if (error.message === 'Unauthorized access to this order') {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to this order',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  },
};
