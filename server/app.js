import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { z } from 'zod';
import {
  DELIVERY_FEE_CENTS,
  FREE_DELIVERY_THRESHOLD_CENTS,
  menuById,
  publicMenu,
} from './menu.js';

const phoneSchema = z.string().trim().min(7).max(25)
  .regex(/^[+()\d\s-]+$/, 'Enter a valid phone number.')
  .refine((value) => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 7 && digits <= 15;
  }, 'Enter a phone number with 7–15 digits.');

const orderSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(10),
  }).strict()).min(1).max(6),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    phone: phoneSchema,
    email: z.union([z.string().trim().max(254).email(), z.literal('')]).optional(),
    address: z.string().trim().max(240).default(''),
    notes: z.string().trim().max(500).optional(),
  }).strict(),
  fulfillment: z.enum(['delivery', 'pickup']),
  paymentMethod: z.literal('cash'),
}).strict().superRefine((order, context) => {
  if (order.fulfillment === 'delivery' && order.customer.address.length < 5) {
    context.addIssue({
      code: 'custom',
      path: ['customer', 'address'],
      message: 'Enter your delivery address.',
    });
  }
  const ids = new Set();
  for (const [index, item] of order.items.entries()) {
    if (!menuById.has(item.id)) {
      context.addIssue({ code: 'custom', path: ['items', index, 'id'], message: 'That pizza is not on the menu.' });
    }
    if (ids.has(item.id)) {
      context.addIssue({ code: 'custom', path: ['items', index, 'id'], message: 'Combine quantities for each pizza.' });
    }
    ids.add(item.id);
  }
});

const orderIdSchema = z.string().uuid();

/** Build an app with its own database; callers close it when the server stops. */
export function createApp({
  dataDir = process.env.DATA_DIR || path.resolve('data'),
  distDir = path.resolve('dist'),
  logger = console,
} = {}) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const databasePath = path.join(dataDir, 'orders.sqlite');
  const database = new DatabaseSync(databasePath);
  chmodSync(databasePath, 0o600);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS orders (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);
  const insertOrder = database.prepare('INSERT INTO orders (id, created_at, payload) VALUES (?, ?, ?)');
  const selectOrder = database.prepare('SELECT sequence, payload FROM orders WHERE id = ?');

  function readOrder(id) {
    const row = selectOrder.get(id);
    if (!row) return null;
    return { ...JSON.parse(row.payload), number: `FN-${1000 + Number(row.sequence)}` };
  }

  const app = express();
  app.disable('x-powered-by');
  app.use((_request, response, next) => {
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use('/api', (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/menu', (_request, response) => {
    response.json({
      items: publicMenu(),
      deliveryFee: DELIVERY_FEE_CENTS / 100,
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD_CENTS / 100,
    });
  });

  app.post('/api/orders', (request, response) => {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ error: parsed.error.issues[0]?.message || 'Check your order details.' });
    }

    const { items, customer, fulfillment, paymentMethod } = parsed.data;
    let subtotalCents = 0;
    const orderItems = items.map(({ id, quantity }) => {
      const pizza = menuById.get(id);
      subtotalCents += pizza.priceCents * quantity;
      return { id, name: pizza.name, quantity, unitPrice: pizza.priceCents / 100 };
    });
    const deliveryFeeCents = fulfillment === 'delivery' && subtotalCents < FREE_DELIVERY_THRESHOLD_CENTS
      ? DELIVERY_FEE_CENTS
      : 0;
    const order = {
      id: randomUUID(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      items: orderItems,
      subtotal: subtotalCents / 100,
      deliveryFee: deliveryFeeCents / 100,
      total: (subtotalCents + deliveryFeeCents) / 100,
      customer,
      fulfillment,
      paymentMethod,
      estimatedMinutes: fulfillment === 'pickup' ? 20 : 35,
    };
    insertOrder.run(order.id, order.createdAt, JSON.stringify(order));
    response.status(201).json({ order: readOrder(order.id) });
  });

  app.get('/api/orders/:id', (request, response) => {
    const parsed = orderIdSchema.safeParse(request.params.id);
    if (!parsed.success) {
      return response.status(400).json({ error: 'Invalid order ID.' });
    }
    const order = readOrder(parsed.data);
    if (!order) return response.status(404).json({ error: 'Order not found.' });
    response.json({ order });
  });

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'API endpoint not found.' });
  });

  if (existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (_request, response) => {
      response.set('Cache-Control', 'no-cache');
      response.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((error, _request, response, _next) => {
    if (error.type === 'entity.too.large') {
      return response.status(413).json({ error: 'Your order is too large.' });
    }
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return response.status(400).json({ error: 'Send a valid JSON order.' });
    }
    logger.error('Request failed:', error);
    response.status(500).json({ error: 'We could not process that request. Please try again.' });
  });

  return { app, close: () => database.close() };
}
