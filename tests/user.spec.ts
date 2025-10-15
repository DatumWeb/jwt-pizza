import { test, expect } from 'playwright-test-coverage';
import type { Page, Route } from '@playwright/test';

// ============= SHARED TEST UTILITIES =============

async function setupBasicMocks(page: Page) {
  // Mock menu endpoint
  await page.route('**/api/order/menu', async (route: Route) => {
    await route.fulfill({
      json: [
        {
          id: 1,
          title: 'Veggie',
          image: 'pizza1.png',
          price: 0.0038,
          description: 'A garden of delight',
        },
        {
          id: 2,
          title: 'Pepperoni',
          image: 'pizza2.png',
          price: 0.0042,
          description: 'Spicy treat',
        },
      ],
    });
  });

  // Mock franchise endpoint
  await page.route('**/api/franchise*', async (route: Route) => {
    await route.fulfill({
      json: {
        franchises: [
          {
            id: 5,
            name: 'LotaPizza',
            admins: [{ id: 3, name: 'franchisee', email: 'f@jwt.com' }],
            stores: [
              { id: 6, name: 'Lehi', totalRevenue: 0.1 },
              { id: 7, name: 'Springville', totalRevenue: 0.05 },
            ],
          },
        ],
        more: false,
      },
    });
  });

  // Mock store endpoint
  await page.route('**/api/store', async (route: Route) => {
    await route.fulfill({
      json: [
        { id: 6, name: 'Lehi', totalRevenue: 0.1 },
        { id: 7, name: 'Springville', totalRevenue: 0.05 },
      ],
    });
  });

  // Mock order creation
  await page.route('**/api/order', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          order: {
            items: [],
            storeId: '6',
            franchiseId: 5,
            id: 23,
          },
          jwt: 'token',
        },
      });
    } else {
      // GET orders (history)
      await route.fulfill({
        json: {
          dinerId: 2,
          orders: [
            {
              id: 1,
              franchiseId: 5,
              storeId: 6,
              date: '2024-01-01T12:00:00.000Z',
              items: [
                { id: 1, menuId: 1, description: 'Veggie', price: 0.0038 },
              ],
            },
          ],
          page: 0,
        },
      });
    }
  });

  await page.goto('/');
}

async function setupAdminMocks(page: Page) {
  // Mock franchise endpoint
  await page.route('**/api/franchise?*', async (route: Route) => {
    await route.fulfill({
      json: {
        franchises: [
          {
            id: 5,
            name: 'LotaPizza',
            admins: [{ id: 3, name: 'franchisee', email: 'f@jwt.com' }],
            stores: [
              { id: 6, name: 'Lehi', totalRevenue: 0.1 },
              { id: 7, name: 'Springville', totalRevenue: 0.05 },
            ],
          },
        ],
        more: false,
      },
    });
  });

  // Mock user list endpoint
  await page.route('**/api/user?*', async (route: Route) => {
    await route.fulfill({
      json: {
        users: [
          { id: 1, name: 'admin', email: 'admin@jwt.com', roles: [{ role: 'admin' }] },
          { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
          { id: 3, name: 'franchisee', email: 'f@jwt.com', roles: [{ role: 'diner' }, { role: 'franchisee' }] },
        ],
        more: false,
      },
    });
  });

  // Mock auth
  await page.route('**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'admin@jwt.com' && loginReq.password === 'admin') {
      await route.fulfill({
        json: {
          user: {
            id: 1,
            name: 'admin',
            email: 'admin@jwt.com',
            roles: [{ role: 'admin' }],
          },
          token: 'admin-token',
        },
      });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock user/me
  await page.route('**/api/user/me', async (route: Route) => {
    await route.fulfill({
      json: {
        id: 1,
        name: 'admin',
        email: 'admin@jwt.com',
        roles: [{ role: 'admin' }],
      },
    });
  });

  // Mock franchise deletion
  await page.route('**/api/franchise/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'Franchise closed successfully' } });
    }
  });

  // Mock user deletion
  await page.route('**/api/user/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: {} });
    }
  });

  // Mock store deletion
  await page.route('**/api/store/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'Store closed successfully' } });
    }
  });

  await page.goto('/');
}

async function setupDinerMocks(page: Page) {
  // Mock auth for diner
  await page.route('**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    if (method === 'POST') {
      const registerReq = route.request().postDataJSON();
      await route.fulfill({
        json: {
          user: { id: 4, name: registerReq.name, email: registerReq.email, roles: [{ role: 'diner' }] },
          token: 'new-user-token',
        },
      });
      return;
    }
    
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'd@jwt.com' && loginReq.password === 'diner') {
      await route.fulfill({
        json: {
          user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
          token: 'diner-token',
        },
      });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock user/me for diner
  await page.route('**/api/user/me', async (route: Route) => {
    await route.fulfill({
      json: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
    });
  });

  // Mock user update
  await page.route('**/api/user/*', async (route: Route) => {
    if (route.request().method() === 'PUT') {
      const req = route.request().postDataJSON();
      await route.fulfill({
        json: {
          user: { id: 2, name: req.name, email: req.email, roles: [{ role: 'diner' }] },
          token: 'updated-user-token',
        },
      });
    }
  });

  await page.goto('/');
}

// ============= AUTHENTICATION TESTS =============

test.describe('Authentication', () => {
  test('user registration flow', async ({ page }) => {
    await setupDinerMocks(page);
    
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByPlaceholder('Full name').fill('Test User');
    await page.getByPlaceholder('Email address').fill('test@jwt.com');
    await page.getByPlaceholder('Password').fill('testpass');
    await page.getByRole('button', { name: 'Register' }).click();
    
    await expect(page.getByRole('link', { name: 'TU' })).toBeVisible();
  });

  test('user login flow', async ({ page }) => {
    await setupDinerMocks(page);
    
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('diner');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByRole('link', { name: 'PD' })).toBeVisible();
  });

  test('failed login shows error', async ({ page }) => {
    await setupDinerMocks(page);
    
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('bad@jwt.com');
    await page.getByPlaceholder('Password').fill('wrong');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('logout functionality', async ({ page }) => {
    await setupDinerMocks(page);
    
    // Login first
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('diner');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Then logout
    await page.getByRole('link', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  });
});

// ============= USER MANAGEMENT TESTS =============

test.describe('User Management', () => {
  test('update user profile', async ({ page }) => {
    const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
    
    // Mock register and subsequent user/me fetch
    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'POST') {
        const req = route.request().postDataJSON();
        await route.fulfill({
          json: {
            user: { id: 2, name: req.name, email: req.email, roles: [{ role: 'diner' }] },
            token: 'new-user-token',
          },
        });
        return;
      }
      if (route.request().method() === 'PUT') {
        const req = route.request().postDataJSON();
        if (req.email === email) {
          await route.fulfill({
            json: {
              user: { id: 2, name: 'pizza dinerx', email: req.email, roles: [{ role: 'diner' }] },
              token: 'login-token',
            },
          });
          return;
        }
      }
      await route.fallback();
    });

    await page.route('**/api/user/me', async (route) => {
      const authHeader = route.request().headers()['authorization'];
      if (authHeader && authHeader.includes('login-token')) {
        await route.fulfill({
          json: { id: 2, name: 'pizza dinerx', email, roles: [{ role: 'diner' }] },
        });
      } else {
        await route.fulfill({
          json: { id: 2, name: 'pizza diner', email, roles: [{ role: 'diner' }] },
        });
      }
    });

    await page.route('**/api/user/*', async (route) => {
      if (route.request().method() === 'PUT') {
        const req = route.request().postDataJSON();
        await route.fulfill({
          json: {
            user: { id: 2, name: req.name, email: req.email, roles: [{ role: 'diner' }] },
            token: 'updated-user-token',
          },
        });
      }
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill('diner');
    await page.getByRole('button', { name: 'Register' }).click();

    await page.getByRole('link', { name: 'PD' }).click();
    await expect(page.getByRole('main')).toContainText('pizza diner');

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('h3')).toContainText('Edit user');
    await page.getByRole('textbox').first().fill('pizza dinerx');
    await page.getByRole('button', { name: 'Update' }).click();

    await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
    await expect(page.getByRole('main')).toContainText('pizza dinerx');

    // Test persistence by logging out and back in
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.getByRole('link', { name: 'Login' }).click();

    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill('diner');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'PD' }).click();
    await expect(page.getByRole('main')).toContainText('pizza dinerx');
  });
});

// ============= ADMIN DASHBOARD TESTS =============

test.describe('Admin Dashboard', () => {
  test('admin dashboard displays franchises and users', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();

    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Franchises')).toBeVisible();
    await expect(page.getByText('Users')).toBeVisible();
  });

  test('admin dashboard franchise filter', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const filterInputs = page.locator('input[placeholder="Filter franchises"]');
    await filterInputs.fill('Lota');
    
    const submitButtons = page.locator('button:has-text("Submit")');
    await submitButtons.first().click();

    await page.waitForTimeout(300);
    await expect(page.getByText('LotaPizza')).toBeVisible();
  });

  test('admin dashboard user filter', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText('Users')).toBeVisible({ timeout: 10000 });

    const filterInputs = page.locator('input[placeholder="Filter users"]');
    await filterInputs.fill('admin');

    const submitButtons = page.locator('button:has-text("Submit")');
    await submitButtons.nth(1).click();

    await page.waitForTimeout(300);
    await expect(page.getByText('admin@jwt.com')).toBeVisible();
  });

  test('admin dashboard delete user cancel', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText('Users')).toBeVisible({ timeout: 10000 });

    const deleteButtons = page.locator('button:has-text("Delete")');
    await deleteButtons.first().click();

    await expect(page.getByText('Confirm Delete')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('#hs-delete-user-modal')).toHaveClass(/hidden/);
  });

  test('admin dashboard delete user confirm', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText('Users')).toBeVisible({ timeout: 10000 });

    const deleteButtons = page.locator('button:has-text("Delete")');
    await deleteButtons.first().click();

    await expect(page.getByText('Confirm Delete')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('#hs-delete-user-modal')).toHaveClass(/hidden/);
  });

  test('admin dashboard add franchise navigation', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add Franchise' }).click();

    await expect(page.url()).toContain('create-franchise');
  });
});

// ============= FRANCHISE MANAGEMENT TESTS =============

test.describe('Franchise Management', () => {
  test('close franchise page renders with state', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const closeButtons = page.locator('td button:has-text("Close")');
    const franchiseCloseBtn = closeButtons.first();
    await franchiseCloseBtn.click({ timeout: 10000 });

    await expect(page.getByText('Sorry to see you go')).toBeVisible();
    await expect(page.getByText('LotaPizza')).toBeVisible();
  });

  test('close franchise cancel button', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const closeButtons = page.locator('td button:has-text("Close")');
    await closeButtons.first().click({ timeout: 10000 });

    await expect(page.getByText('Sorry to see you go')).toBeVisible();

    const buttons = page.getByRole('button', { name: 'Cancel' });
    await buttons.first().click();

    await expect(page.url()).toContain('admin-dashboard');
  });

  test('close franchise confirm closes franchise', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const closeButtons = page.locator('td button:has-text("Close")');
    await closeButtons.first().click({ timeout: 10000 });

    await expect(page.getByText('Sorry to see you go')).toBeVisible();

    const closeBtn = page.getByRole('button', { name: 'Close' });
    await closeBtn.first().click();

    await page.waitForTimeout(500);

    await expect(page.url()).toContain('admin-dashboard');
  });
});

// ============= STORE MANAGEMENT TESTS =============

test.describe('Store Management', () => {
  test('close store page renders with state', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const storeCloseBtn = page.locator('tbody td button:has-text("Close")').first();
    await storeCloseBtn.click({ timeout: 10000 });

    await expect(page.getByText('Sorry to see you go')).toBeVisible();
    await expect(page.getByText(/store/i)).toBeVisible();
  });

  test('close store cancel button', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const storeCloseBtn = page.locator('tbody td button:has-text("Close")').first();
    await storeCloseBtn.click({ timeout: 10000 });

    await expect(page.getByText('Sorry to see you go')).toBeVisible();

    const buttons = page.getByRole('button', { name: 'Cancel' });
    await buttons.first().click();

    await expect(page.url()).toContain('admin-dashboard');
  });

  test('close store confirm closes store', async ({ page }) => {
    await setupAdminMocks(page);

    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'AD' }).click();
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible({ timeout: 10000 });

    const storeCloseBtn = page.locator('tbody td button:has-text("Close")').first();
    await storeCloseBtn.click({ timeout: 10000 });

    await expect(page.getByText('Sorry to see you go')).toBeVisible();

    const closeBtn = page.getByRole('button', { name: 'Close' });
    await closeBtn.first().click();

    await page.waitForTimeout(500);

    await expect(page.url()).toContain('admin-dashboard');
  });
});

// ============= MENU AND ORDERING TESTS =============

test.describe('Menu and Ordering', () => {
  test('menu page loads with store options', async ({ page }) => {
    await setupBasicMocks(page);

    await page.goto('/menu');

    await expect(page.getByText('Awesome is a click away')).toBeVisible();
    
    const storeSelect = page.locator('select');
    await expect(storeSelect).toBeVisible();

    const options = storeSelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('menu page checkout disabled without store', async ({ page }) => {
    await setupBasicMocks(page);

    await page.goto('/menu');

    const checkoutBtn = page.getByRole('button', { name: 'Checkout' });
    await expect(checkoutBtn).toBeDisabled();

    await expect(page.getByText(/What are you waiting for/)).toBeVisible();
  });

  test('menu page add pizza items', async ({ page }) => {
    await setupBasicMocks(page);

    await page.goto('/menu');

    const storeSelect = page.locator('select');
    await storeSelect.evaluate((el: HTMLSelectElement) => {
      el.value = '6';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.waitForTimeout(200);

    const pizzaButton = page.locator('button:has-text("Veggie")').first();
    await pizzaButton.click();

    await page.waitForTimeout(200);

    await expect(page.getByText(/Selected pizzas: 1/)).toBeVisible();

    const pepperoniButton = page.locator('button:has-text("Pepperoni")').first();
    await pepperoniButton.click();

    await page.waitForTimeout(200);

    await expect(page.getByText(/Selected pizzas: 2/)).toBeVisible();
  });

  test('menu page checkout with items navigates to payment', async ({ page }) => {
    await setupBasicMocks(page);

    await page.goto('/menu');

    const storeSelect = page.locator('select');
    await storeSelect.evaluate((el: HTMLSelectElement) => {
      el.value = '6';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.waitForTimeout(200);

    const pizzaButton = page.locator('button:has-text("Veggie")').first();
    await pizzaButton.click();

    await page.waitForTimeout(200);

    const checkoutBtn = page.getByRole('button', { name: 'Checkout' });
    await checkoutBtn.click();

    await page.waitForTimeout(500);

    await expect(page.url()).toContain('payment');
  });

  test('menu page shows pizza options', async ({ page }) => {
    await setupBasicMocks(page);

    await page.goto('/menu');

    await expect(page.getByText('Veggie')).toBeVisible();
    await expect(page.getByText('Pepperoni')).toBeVisible();
    await expect(page.getByText('A garden of delight')).toBeVisible();
    await expect(page.getByText('Spicy treat')).toBeVisible();
  });
});

// ============= PAGE NAVIGATION TESTS =============

test.describe('Page Navigation', () => {
  test('home page loads', async ({ page }) => {
    await setupBasicMocks(page);
    await expect(page).toHaveTitle('JWT Pizza');
  });

  test('docs page loads', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.getByRole('main')).toContainText('JWT Pizza API');
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('main')).toContainText('The secret sauce');
  });

  test('history page loads', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('main')).toContainText('Mama Ricci');
  });

  test('delivery page loads', async ({ page }) => {
    await page.goto('/delivery');
    await expect(page.getByText('Delivery')).toBeVisible();
  });

  test('payment page loads', async ({ page }) => {
    await page.goto('/payment');
    await expect(page.getByText('Payment')).toBeVisible();
  });

  test('create franchise page loads', async ({ page }) => {
    await page.goto('/admin-dashboard/create-franchise');
    await expect(page.getByText('Create franchise', { exact: true })).toBeVisible();
  });

  test('create store page loads', async ({ page }) => {
    await page.goto('/admin-dashboard/create-store');
    await expect(page.getByText('Create Store')).toBeVisible();
  });

  test('404 page loads', async ({ page }) => {
    await page.goto('/invalid-route');
    await expect(page.getByRole('main')).toContainText('Oops');
  });
});

// ============= DINER DASHBOARD TESTS =============

test.describe('Diner Dashboard', () => {
  test('diner dashboard shows order history', async ({ page }) => {
    await setupDinerMocks(page);
    
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('diner');
    await page.getByRole('button', { name: 'Login' }).click();
    
    await page.getByRole('link', { name: 'PD' }).click();
    
    await expect(page.getByText('Your pizza kitchen')).toBeVisible();
    await expect(page.locator('text=d@jwt.com')).toBeVisible();
  });
});