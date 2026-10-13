import { expect, test } from '@playwright/test';

test('menu filtering and search show matching pizzas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.pizza-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Vegetarian', exact: true }).click();
  await expect(page.locator('.pizza-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'All pizzas', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search pizzas or ingredients' }).fill('pepperoni');
  await expect(page.locator('.pizza-card')).toHaveCount(1);
  await expect(page.locator('.pizza-card h3')).toHaveText('Pepperoni');
  await page.getByRole('searchbox').fill('pineapple-unicorn');
  await expect(page.getByText('No pizzas found for that flavor.')).toBeVisible();
  await page.getByRole('button', { name: 'See all pizzas' }).click();
  await expect(page.locator('.pizza-card')).toHaveCount(6);
});

test('delivery checkout saves an order and restores its receipt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Margherita to your order' }).click();
  await page.getByRole('button', { name: /Open your order, 1 item/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.grand-total')).toContainText('$15.50');
  await dialog.getByRole('button', { name: 'Continue to checkout' }).click();
  await dialog.getByRole('button', { name: /Place order/ }).click();
  await expect(dialog.getByText('Please enter your name.')).toBeVisible();
  await dialog.getByLabel('Full name').fill('Alex Test');
  await dialog.getByLabel('Phone number').fill('5551234567');
  await dialog.getByLabel('Delivery address').fill('123 Test Street, Los Angeles, CA 90001');
  await dialog.getByRole('button', { name: 'Place order · $15.50' }).click();
  await expect(dialog.getByText('ORDER CONFIRMED', { exact: true })).toBeVisible();
  await expect(dialog).toContainText('FN-');
  await expect(dialog).toContainText('$15.50');
  await dialog.getByRole('button', { name: 'Close order panel' }).click();
  await expect(page.getByRole('button', { name: 'Open your order, 0 items' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'My order' }).click();
  await expect(page.getByRole('dialog').getByText('ORDER CONFIRMED', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('123 Test Street');
});

test('cart survives reload, updates totals, and supports keyboard dismissal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Margherita to your order' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open your order, 1 item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Add one Margherita' }).click();
  await dialog.getByRole('button', { name: 'Add one Margherita' }).click();
  await expect(dialog.locator('.grand-total')).toContainText('$36.00');
  await expect(dialog.getByText('You’ve unlocked free delivery. Nice.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open your order, 3 items' })).toBeFocused();
});

test('mobile pickup checkout needs no address and has no fee', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.pizza-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Add Pepperoni to your order' }).click();
  await page.getByRole('button', { name: 'Open your order, 1 item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Pickup', exact: true }).click();
  await expect(dialog.locator('.grand-total')).toContainText('$15.00');
  await dialog.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(dialog.getByLabel('Delivery address')).toHaveCount(0);
  await dialog.getByLabel('Full name').fill('Taylor Pickup');
  await dialog.getByLabel('Phone number').fill('5559876543');
  await dialog.getByRole('button', { name: 'Place order · $15.00' }).click();
  await expect(dialog.getByText('ORDER CONFIRMED', { exact: true })).toBeVisible();
  await expect(dialog).toContainText('Pickup');
  await expect(dialog).toContainText('$15.00');
});
