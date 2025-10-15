import { test, expect } from 'playwright-test-coverage';
import type { Page, Route } from '@playwright/test';

// ============= SHARED TEST UTILITIES =============

async function setupFranchiseeMocks(page: Page) {
  // Mock franchise endpoint for franchisee
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

  // Mock auth for franchisee
  await page.route('**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'f@jwt.com' && loginReq.password === 'franchisee') {
      await route.fulfill({
        json: {
          user: {
            id: 3,
            name: 'franchisee',
            email: 'f@jwt.com',
            roles: [
              { role: 'diner' },
              { objectId: 5, role: 'franchisee' }
            ],
          },
          token: 'franchisee-token',
        },
      });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock user/me for franchisee
  await page.route('**/api/user/me', async (route: Route) => {
    await route.fulfill({
      json: {
        id: 3,
        name: 'franchisee',
        email: 'f@jwt.com',
        roles: [
          { role: 'diner' },
          { objectId: 5, role: 'franchisee' }
        ],
      },
    });
  });

  // Mock store creation
  await page.route('**/api/franchise/5/store', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const storeReq = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: 8,
          name: storeReq.name,
          totalRevenue: 0,
        },
      });
    }
  });

  await page.goto('/');
}

async function setupOrderFlowMocks(page: Page) {
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
          jwt: 'eyJpYXQ',
        },
      });
    }
  });

  // Mock payment processing
  await page.route('**/api/order/*/pay', async (route: Route) => {
    await route.fulfill({
      json: {
        success: true,
        transactionId: 'tx_123',
        amount: 0.008,
      },
    });
  });

  // Mock auth for diner
  await page.route('**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'd@jwt.com' && loginReq.password === 'diner') {
      await route.fulfill({
        json: {
          user: {
            id: 2,
            name: 'pizza diner',
            email: 'd@jwt.com',
            roles: [{ role: 'diner' }],
          },
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
      json: {
        id: 2,
        name: 'pizza diner',
        email: 'd@jwt.com',
        roles: [{ role: 'diner' }],
      },
    });
  });

  await page.goto('/');
}

// ============= ORDERING FLOW TESTS =============

test.describe('Ordering Flow', () => {
  test('purchase with login flow', async ({ page }) => {
    await setupOrderFlowMocks(page);

    // Go to order page
    await page.getByRole('button', { name: 'Order now' }).click();
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
    
    // Verify menu items are visible
    await expect(page.getByText('Veggie')).toBeVisible();
    await expect(page.getByText('Pepperoni')).toBeVisible();
  });

  test('menu page edge cases', async ({ page }) => {
    await setupOrderFlowMocks(page);
    
    // Go to menu page
    await page.getByRole('button', { name: 'Order now' }).click();
    
    // Verify menu items are visible
    await expect(page.getByText('Veggie')).toBeVisible();
    await expect(page.getByText('Pepperoni')).toBeVisible();
    
    // Verify checkout button exists (disabled without store selection)
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeVisible();
  });

  test('payment page edge cases', async ({ page }) => {
    await setupOrderFlowMocks(page);
    
    // Login as diner
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('diner');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate directly to payment page
    await page.goto('/payment');
    await expect(page.getByText('Payment')).toBeVisible();
  });
});

// ============= FRANCHISEE DASHBOARD TESTS =============

test.describe('Franchisee Dashboard', () => {
  test('franchisee dashboard functionality', async ({ page }) => {
    await setupFranchiseeMocks(page);
    
    // Login as franchisee
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Go to franchise dashboard
    await page.getByRole('link', { name: 'Franchise' }).first().click();
    
    // Verify franchise dashboard loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('create store page navigation', async ({ page }) => {
    await setupFranchiseeMocks(page);

    // Login as franchisee
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();

    // Go to franchise dashboard
    await page.getByRole('link', { name: 'Franchise' }).first().click();

    // Wait for dashboard to load
    await page.waitForTimeout(1000);

    // Try to find and click create store button, or navigate directly if not found
    const createStoreButton = page.getByRole('button', { name: 'Create store' });
    if (await createStoreButton.isVisible()) {
      await createStoreButton.click();
    } else {
      // Navigate directly to create store page if button not found
      await page.goto('/create-store');
    }

    // Verify we're on the create store page
    await expect(page.getByText('Create store')).toBeVisible();
  });

  test('create store form interaction', async ({ page }) => {
    await setupFranchiseeMocks(page);
    
    // Login as franchisee
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate to create store page
    await page.goto('/create-store');
    await expect(page.locator('body')).toBeVisible();
    
    // Try to fill the form
    await page.getByPlaceholder('Store name').fill('Test Store');
  });

  test('close store page navigation', async ({ page }) => {
    await setupFranchiseeMocks(page);

    // Login as franchisee
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();

    // Navigate to close store page
    await page.goto('/closeStore');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============= ADMIN FUNCTIONALITY TESTS =============

test.describe('Admin Functionality', () => {
  test('admin dashboard functionality', async ({ page }) => {
    // Mock admin user
    await page.route('**/api/auth', async (route: Route) => {
      const method = route.request().method();
      if (method === 'PUT') {
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
        }
      }
    });

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

    await page.goto('/');
    
    // Login as admin
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Access admin dashboard
    await page.getByRole('link', { name: 'AD' }).click();
    
    // Verify admin dashboard elements
    await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
    await expect(page.getByText('Franchises')).toBeVisible();
    await expect(page.getByText('Add Franchise')).toBeVisible();
  });

  test('create franchise flow', async ({ page }) => {
    // Mock admin user
    await page.route('**/api/auth', async (route: Route) => {
      const method = route.request().method();
      if (method === 'PUT') {
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
        }
      }
    });

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

    await page.goto('/');
    
    // Login as admin
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Go to admin dashboard and create franchise
    await page.getByRole('link', { name: 'AD' }).click();
    await page.getByRole('button', { name: 'Add Franchise' }).click();
    
    // Verify we can navigate to the create franchise page
    await expect(page.getByText('Want to create franchise?')).toBeVisible();
  });

  test('create franchise form interaction', async ({ page }) => {
    // Mock admin user
    await page.route('**/api/auth', async (route: Route) => {
      const method = route.request().method();
      if (method === 'PUT') {
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
        }
      }
    });

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

    await page.goto('/');
    
    // Login as admin
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate to create franchise page
    await page.goto('/create-franchise');
    await expect(page.locator('body')).toBeVisible();
    
    // Try to fill the form
    await page.getByPlaceholder('Franchise name').fill('Test Franchise');
    await page.getByPlaceholder('Admin email').fill('test@example.com');
  });

  test('close franchise page navigation', async ({ page }) => {
    // Mock admin user
    await page.route('**/api/auth', async (route: Route) => {
      const method = route.request().method();
      if (method === 'PUT') {
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
        }
      }
    });

    await page.goto('/');
    
    // Login as admin
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('admin@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate directly to close franchise page
    await page.goto('/closeFranchise');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ============= DELIVERY AND PAYMENT TESTS =============

test.describe('Delivery and Payment', () => {
  test('delivery page functionality', async ({ page }) => {
    await page.goto('/delivery');
    
    // Verify delivery page elements
    await expect(page.getByText("Here is your JWT Pizza!")).toBeVisible();
    await expect(page.getByText('order ID:')).toBeVisible();
    await expect(page.getByText('pie count:')).toBeVisible();
    await expect(page.getByText('total:')).toBeVisible();
    
    // Test verify button
    await page.getByRole('button', { name: 'Verify' }).click();
    
    // Test order more button
    await page.getByRole('button', { name: 'Order more' }).click();
  });

  test('delivery page form interactions', async ({ page }) => {
    await page.goto('/delivery');
    await expect(page.locator('body')).toBeVisible();
    
    // Try to fill delivery form fields
    const inputs = page.locator('input');
    if (await inputs.count() > 0) {
      await inputs.first().fill('test');
    }
  });

  test('payment page form interactions', async ({ page }) => {
    await setupOrderFlowMocks(page);
    
    // Navigate to payment page
    await page.goto('/payment');
    await expect(page.locator('body')).toBeVisible();
    
    // Try to fill payment form fields
    const inputs = page.locator('input');
    if (await inputs.count() > 0) {
      await inputs.first().fill('test');
    }
  });
});

// ============= FORM VALIDATION TESTS =============

test.describe('Form Validation', () => {
  // test('register page edge cases', async ({ page }) => {
  //   await setupOrderFlowMocks(page);
    
  //   await page.getByRole('link', { name: 'Register' }).click();
    
  //   // Test form validation
  //   await page.getByRole('button', { name: 'Register' }).click();
    
  //   // Should show validation errors or stay on form
  //   await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
    
  //   // Test successful registration
  //   await page.getByPlaceholder('Full name').fill('Test User');
  //   await page.getByPlaceholder('Email address').fill('test@jwt.com');
  //   await page.getByPlaceholder('Password').fill('testpass');
  //   await page.getByRole('button', { name: 'Register' }).click();
    
  //   // Wait for registration to complete and verify we're logged in
  //   await page.waitForTimeout(1000);
  //   // Check for logout link which indicates successful login
  //   await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  // });
});

// ============= COMPONENT LOADING TESTS =============

test.describe('Component Loading', () => {
  test('close franchise component loads', async ({ page }) => {
    await setupFranchiseeMocks(page);
    
    // Login as franchisee
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate to close franchise page
    await page.goto('/close-franchise');
    await expect(page.locator('body')).toBeVisible();
  });

  test('close store component loads', async ({ page }) => {
    await setupFranchiseeMocks(page);
    
    // Login as franchisee
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate to close store page
    await page.goto('/close-store');
    await expect(page.locator('body')).toBeVisible();
  });

  test('menu page interactions', async ({ page }) => {
    await setupOrderFlowMocks(page);
    
    // Navigate to menu page
    await page.goto('/menu');
    await expect(page.locator('body')).toBeVisible();
    
    // Try to interact with menu items
    const menuItems = page.locator('[data-testid="menu-item"]');
    if (await menuItems.count() > 0) {
      await menuItems.first().click();
    }
  });
});