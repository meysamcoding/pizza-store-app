import { expect, test } from '@playwright/test';

test('static demo loads its menu and illustrations from the repository subpath', async ({ page }) => {
  const apiRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on('request', request => {
    if (/\/api(?:\/|$)/.test(new URL(request.url()).pathname)) {
      apiRequests.push(request.url());
    }
  });
  page.on('pageerror', error => browserErrors.push(error.message));

  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.pizza-card')).toHaveCount(6);
  await expect(page.getByText(/Practice site/).first()).toBeVisible();

  const images = page.locator('img');
  await expect(images).toHaveCount(7);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => {
      const img = element as HTMLImageElement;
      return img.complete && img.naturalWidth > 0;
    })).toBe(true);
    expect(await image.evaluate(element => new URL((element as HTMLImageElement).src).pathname))
      .toMatch(/^\/pizza-store-app\/images\//);
  }

  expect(apiRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test('practice cart persists quantities and keeps checkout disabled without a server', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', request => {
    if (/\/api(?:\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(request.url());
  });

  await page.goto('./');
  await page.getByRole('button', { name: 'Add Margherita to your order' }).click();
  await page.getByRole('button', { name: 'Open your order, 1 item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Add one Margherita' }).click();
  await expect(dialog.locator('.grand-total')).toContainText('$27.50');
  await expect(dialog.getByRole('button', { name: 'Checkout unavailable in demo' })).toBeDisabled();
  await expect(dialog.getByLabel('Full name')).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.reload();
  await page.getByRole('button', { name: 'Open your order, 2 items' }).click();
  await expect(page.getByRole('dialog').locator('.grand-total')).toContainText('$27.50');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Checkout unavailable in demo' })).toBeDisabled();
  expect(apiRequests).toEqual([]);
});

test('mobile demo supports menu filters and pickup without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.pizza-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Vegetarian', exact: true }).click();
  await expect(page.locator('.pizza-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'All pizzas', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search pizzas or ingredients' }).fill('pepperoni');
  await expect(page.locator('.pizza-card')).toHaveCount(1);
  await expect(page.locator('.pizza-card h3')).toHaveText('Pepperoni');
  await page.getByRole('button', { name: 'Add Pepperoni to your order' }).click();
  await page.getByRole('button', { name: 'Open your order, 1 item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Pickup', exact: true }).click();
  await expect(dialog.locator('.grand-total')).toContainText('$15.00');
  await expect(dialog.getByRole('button', { name: 'Checkout unavailable in demo' })).toBeDisabled();
});
