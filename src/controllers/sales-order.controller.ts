import type { Request, Response } from 'express';
import { salesOrderService } from '../services/sales-order.service.js';
import { salesInvoiceService } from '../services/sales-invoice.service.js';
import { logger } from '../config/logger.config.js';

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
};
