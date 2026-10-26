import { expect, test } from '@playwright/test';

test('About supports direct links and reloads while navigation preserves the cart', async ({ page }) => {
  await page.goto('./#/about');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A little flour.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A lot of heart.');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A little flour.');

  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: /Our menu/i }).click();
  await expect(page.locator('.pizza-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Add Margherita to your order' }).click();
  await navigation.getByRole('link', { name: /About us/i }).click();
  await expect(page).toHaveURL(/#\/about$/);
  await page.getByRole('button', { name: 'Open your order, 1 item' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Margherita' })).toBeVisible();
  await page.keyboard.press('Escape');

  await navigation.getByRole('link', { name: /Contact us/i }).click();
  await expect(page).toHaveURL(/#\/contact$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good conversations\s*start here\./);
  await page.locator('.site-header').getByRole('link', { name: 'Forno home', exact: true }).click();
  await expect(page.locator('.pizza-card')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Open your order, 1 item' })).toBeVisible();
});

test('mobile navigation opens, dismisses with Escape, and closes after navigating', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const toggle = page.getByRole('button', { name: /^(Open|Close) navigation$/ });
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await navigation.getByRole('link', { name: /About us/i }).click();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(navigation).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A little flour.');
  await toggle.click();
  await navigation.getByRole('link', { name: /Contact us/i }).click();
  await expect(page).toHaveURL(/#\/contact$/);
  await expect(navigation).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good conversations\s*start here\./);
});

test('Contact validates and previews a message without sending or retaining personal details', async ({ page }) => {
  const writeRequests: string[] = [];
  const apiRequests: string[] = [];
  page.on('request', request => {
    if (!['GET', 'HEAD'].includes(request.method())) writeRequests.push(request.url());
    if (/\/api(?:\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(request.url());
  });
  await page.goto('./#/contact');
  await page.getByRole('link', { name: 'Read the FAQs', exact: true }).click();
  await expect(page).toHaveURL(/#\/contact(?:[/?].*)?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good conversations\s*start here\./);
  await expect(page.getByRole('heading', { name: /A few questions/ })).toBeFocused();
  await page.getByRole('button', { name: 'Preview message', exact: true }).click();
  await expect(page.getByText('Please enter your name.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveAttribute('aria-invalid', 'true');

  const details = {
    name: 'Taylor Practice',
    email: 'taylor.practice@example.test',
    message: 'Could you tell me more about the vegetarian pizzas?',
  };
  await page.getByLabel('Your name', { exact: true }).fill(details.name);
  await page.getByLabel('Email address', { exact: true }).fill(details.email);
  await page.getByLabel('Topic', { exact: true }).selectOption({ label: 'Menu question' });
  await page.getByLabel('Your message', { exact: true }).fill(details.message);
  await page.getByRole('button', { name: 'Preview message', exact: true }).click();
  const previewHeading = page.getByRole('heading', { name: 'Message preview — not sent.', exact: true });
  await expect(previewHeading).toBeVisible();
  await expect(previewHeading).toBeFocused();
  await expect(page.getByRole('region', { name: 'Message preview — not sent.', exact: true })
    .getByText(details.message, { exact: true })).toBeVisible();
  expect(writeRequests).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(await page.evaluate(values => {
    const storedValues = [...Object.values(localStorage), ...Object.values(sessionStorage)];
    return storedValues.some(stored => values.some(value => stored.includes(value)));
  }, Object.values(details))).toBe(false);

  await page.reload();
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Your message', { exact: true })).toHaveValue('');
  await expect(previewHeading).toHaveCount(0);
});

test('About and Contact remain usable on phone and tablet widths', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['about', 'contact']) {
      await page.goto(`./#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(element => {
          const img = element as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        })).toBe(true);
      }
    }
  }
  expect(browserErrors).toEqual([]);
});
