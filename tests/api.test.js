import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../server/app.js';

let dataDir;
let server;
let closeDatabase;
let baseUrl;

async function start() {
  const { app, close } = createApp({ dataDir, distDir: path.join(dataDir, 'no-dist') });
  closeDatabase = close;
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stop() {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  closeDatabase();
}

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'pizza-store-test-'));
  await start();
});

after(async () => {
  await stop();
  await rm(dataDir, { recursive: true, force: true });
});

const validOrder = (overrides = {}) => ({
  items: [{ id: 'margherita', quantity: 1 }],
  customer: {
    name: 'Alex Pizza',
    phone: '+1 (415) 555-0123',
    address: '123 Market Street, San Francisco',
  },
  fulfillment: 'delivery',
  paymentMethod: 'cash',
  ...overrides,
});

async function postOrder(body) {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('health and menu expose the six pizzas and delivery pricing', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const response = await fetch(`${baseUrl}/api/menu`);
  const menu = await response.json();
  assert.equal(response.status, 200);
  assert.equal(menu.items.length, 6);
  assert.deepEqual(menu.items.map(({ id, price }) => [id, price]), [
    ['margherita', 12], ['pepperoni', 15], ['truffle', 17],
    ['hot-honey', 16], ['garden', 14], ['burrata', 18],
  ]);
  assert.equal(menu.deliveryFee, 3.5);
  assert.equal(menu.freeDeliveryThreshold, 35);
  assert.ok(menu.items.every((item) => item.image === `/images/${item.id}.svg`));
});

test('creates, reads, and persists an order across an app restart', async () => {
  const { response, body: { order } } = await postOrder(validOrder());
  assert.equal(response.status, 201);
  assert.match(order.id, /^[\da-f-]{36}$/);
  assert.match(order.number, /^FN-\d+$/);
  assert.equal(order.status, 'confirmed');
  assert.equal(order.subtotal, 12);
  assert.equal(order.deliveryFee, 3.5);
  assert.equal(order.total, 15.5);
  assert.equal(order.estimatedMinutes, 35);
  assert.deepEqual(order.items, [{ id: 'margherita', name: 'Margherita', quantity: 1, unitPrice: 12 }]);

  const read = await fetch(`${baseUrl}/api/orders/${order.id}`);
  assert.deepEqual((await read.json()).order, order);
  await stop();
  await start();
  const afterRestart = await fetch(`${baseUrl}/api/orders/${order.id}`);
  assert.deepEqual((await afterRestart.json()).order, order);

  const next = await postOrder(validOrder());
  assert.notEqual(next.body.order.id, order.id);
  assert.equal(Number(next.body.order.number.slice(3)), Number(order.number.slice(3)) + 1);
});

test('waives delivery at the exact threshold and charges below it', async () => {
  const threshold = await postOrder(validOrder({
    items: [{ id: 'truffle', quantity: 1 }, { id: 'burrata', quantity: 1 }],
  }));
  assert.equal(threshold.body.order.subtotal, 35);
  assert.equal(threshold.body.order.deliveryFee, 0);
  assert.equal(threshold.body.order.total, 35);
  const below = await postOrder(validOrder({ items: [{ id: 'hot-honey', quantity: 2 }] }));
  assert.equal(below.body.order.deliveryFee, 3.5);
  assert.equal(below.body.order.total, 35.5);
});

test('pickup has no fee, a shorter estimate, and no delivery address requirement', async () => {
  const order = validOrder({ fulfillment: 'pickup' });
  delete order.customer.address;
  const { response, body } = await postOrder(order);
  assert.equal(response.status, 201);
  assert.equal(body.order.deliveryFee, 0);
  assert.equal(body.order.total, 12);
  assert.equal(body.order.estimatedMinutes, 20);
});

test('rejects invalid orders and refuses client-supplied prices', async () => {
  const invalid = [
    validOrder({ items: [] }),
    validOrder({ items: [{ id: 'margherita', quantity: 0 }] }),
    validOrder({ items: [{ id: 'margherita', quantity: 11 }] }),
    validOrder({ items: [{ id: 'margherita', quantity: 1.5 }] }),
    validOrder({ items: [{ id: 'margherita', quantity: '2' }] }),
    validOrder({ items: [{ id: 'unknown', quantity: 1 }] }),
    validOrder({ items: [{ id: "'; DROP TABLE orders;--", quantity: 1 }] }),
    validOrder({ items: [{ id: 'margherita', quantity: 1 }, { id: 'margherita', quantity: 1 }] }),
    validOrder({ items: [{ id: 'margherita', quantity: 1, price: 0.01 }] }),
    validOrder({ total: 0.01 }),
    validOrder({ paymentMethod: 'card' }),
    validOrder({ fulfillment: 'flying' }),
    validOrder({ customer: { name: 'A', phone: '123', address: '' } }),
    validOrder({ customer: { name: 'Alex', phone: '4155550123', address: '123 Street', email: 'bad-email' } }),
    validOrder({ customer: { name: 'Alex', phone: '4155550123', address: '123 Street', notes: 'a'.repeat(501) } }),
  ];
  for (const request of invalid) {
    const { response, body } = await postOrder(request);
    assert.equal(response.status, 400, JSON.stringify(request));
    assert.equal(typeof body.error, 'string');
    assert.equal(body.order, undefined);
  }
  assert.equal((await postOrder(validOrder())).response.status, 201);
});

test('unknown UUIDs, malformed IDs, and missing API routes are structured errors', async () => {
  for (const [endpoint, status] of [
    [`/api/orders/${randomUUID()}`, 404],
    ['/api/orders/not-an-id', 400],
    ['/api/missing', 404],
  ]) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('rejects oversized and malformed JSON without exposing errors', async () => {
  for (const [body, status] of [['{bad json}', 400], [JSON.stringify({ notes: 'a'.repeat(40_000) }), 413]]) {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(response.status, status);
    assert.deepEqual(Object.keys(await response.json()), ['error']);
  }
});
