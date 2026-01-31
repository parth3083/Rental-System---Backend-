import swaggerJSDoc from 'swagger-jsdoc';
import type { Options } from 'swagger-jsdoc';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rental Server API',
      version: '1.0.0',
      description: 'API documentation for the Rental Server Backend',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'VENDOR', 'CUSTOMER'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account last update timestamp',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                token: {
                  type: 'string',
                  description: 'JWT access token',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        DurationUnit: {
          type: 'string',
          enum: ['Hour', 'Day', 'Week', 'Month'],
          description: 'Unit for rental duration',
        },
        RentalDurationFilter: {
          type: 'object',
          properties: {
            value: {
              type: 'integer',
              description: 'Duration value (e.g., 2)',
            },
            unit: {
              $ref: '#/components/schemas/DurationUnit',
            },
          },
        },
        ProductCardDto: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Product unique identifier',
            },
            name: {
              type: 'string',
            },
            brand: {
              type: 'string',
            },
            imageUrl: {
              type: 'string',
            },
            color: {
              type: 'string',
            },
            priceLabel: {
              type: 'string',
              description:
                'Display label for price (e.g. "Total for 2 Months" or "Per Day")',
            },
            originalPrice: {
              type: 'number',
              format: 'decimal',
            },
            finalPrice: {
              type: 'number',
              format: 'decimal',
            },
            discountPercentage: {
              type: 'integer',
            },
            isAvailable: {
              type: 'boolean',
            },
          },
        },
        PagedResultProduct: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductCardDto',
              },
            },
            totalCount: {
              type: 'integer',
            },
            pageNumber: {
              type: 'integer',
            },
            pageSize: {
              type: 'integer',
            },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: [
            'name',
            'description',
            'brand',
            'categoryId',
            'imageUrl',
            'securityDeposit',
          ],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            brand: { type: 'string' },
            color: { type: 'string', default: 'Generic' },
            categoryId: { type: 'integer' },
            imageUrl: { type: 'string', format: 'uri' },
            hourlyPrice: { type: 'number', nullable: true },
            dailyPrice: { type: 'number', nullable: true },
            weeklyPrice: { type: 'number', nullable: true },
            monthlyPrice: { type: 'number', nullable: true },
            discountPercentage: { type: 'integer', default: 0 },
            securityDeposit: { type: 'number' },
            isPublished: { type: 'boolean', default: true },
          },
        },
        UpdateProductRequest: {
          type: 'object',
          required: [
            'name',
            'description',
            'brand',
            'categoryId',
            'imageUrl',
            'securityDeposit',
          ],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            brand: { type: 'string' },
            color: { type: 'string', default: 'Generic' },
            categoryId: { type: 'integer' },
            imageUrl: { type: 'string', format: 'uri' },
            hourlyPrice: { type: 'number', nullable: true },
            dailyPrice: { type: 'number', nullable: true },
            weeklyPrice: { type: 'number', nullable: true },
            monthlyPrice: { type: 'number', nullable: true },
            discountPercentage: { type: 'integer', default: 0 },
            securityDeposit: { type: 'number' },
            isAvailable: { type: 'boolean', default: true },
            isPublished: { type: 'boolean', default: true },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            productId: { type: 'string' },
            quantity: { type: 'integer' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            product: { $ref: '#/components/schemas/ProductCardDto' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AddToCartRequest: {
          type: 'object',
          required: ['productId', 'quantity', 'startDate', 'endDate'],
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: 'Products',
        description: 'Product management and retrieval endpoints',
      },
      {
        name: 'Cart',
        description: 'Shopping cart management endpoints',
      },
    ],
  },
  apis: ['./src/controllers/*.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
