import { expect, test } from '@playwright/test';

test('homepage renders the We Onboard hero and key navigation', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('./');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.getByRole('link', { name: 'We Onboard Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Services', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'For Businesses', exact: true }).first()).toBeVisible();
  await expect(page.locator('#contact')).toBeAttached();
  expect(pageErrors).toEqual([]);
});

test('freelancer registration opens from the homepage', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Join as Freelancer' }).first().click();
  await expect(page.getByRole('heading', { name: 'Join the We Onboard Field Network' })).toBeVisible();
  await expect(page.getByText('Route: /join-as-freelancer.php')).toBeVisible();
});

test('freelancer portal shows its under-development state', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Freelancer Portal' }).first().click();
  await expect(page.getByRole('heading', { name: 'Freelancer Portal is Under Development' })).toBeVisible();
  await expect(page.getByText('COMING SOON')).toBeVisible();
});

test('contact form exposes required fields and telephone/email links', async ({ page }) => {
  await page.goto('./');
  const contact = page.locator('#contact');
  await expect(contact.getByRole('heading', { name: 'Send an enquiry' })).toBeVisible();
  await expect(contact.getByPlaceholder('Your full name')).toHaveAttribute('required', '');
  await expect(contact.locator('input[type="tel"]').first()).toBeVisible();
  await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
});

test('mobile homepage has no horizontal page overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout assertion runs in the mobile project.');
  await page.goto('./');
  await expect(page.locator('#home')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
});

test('contact enquiry shows a confirmation for dummy data', async ({ page }) => {
  await page.goto('./');
  const contact = page.locator('#contact');
  await contact.getByPlaceholder('Your full name').fill('Playwright Test User');
  await contact.getByPlaceholder('+91 98450 XXXXX').fill('9999999999');
  await contact.getByPlaceholder('you@company.in').fill('playwright@example.test');
  await contact.getByRole('button', { name: 'Submit Enquiry to Database' }).click();
  await expect(contact.getByRole('heading', { name: 'Enquiry Recorded Successfully!' })).toBeVisible();
  await expect(contact.getByText(/WO-ENQ-/)).toBeVisible();
});
