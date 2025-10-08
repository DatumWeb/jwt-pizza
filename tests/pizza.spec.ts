import { test, expect } from 'playwright-test-coverage';
import type { Page, Route } from '@playwright/test';

async function basicInit(page: Page) {
  // Mock the menu endpoint
  await page.route('*/**/api/order/menu', async (route: Route) => {
    const menuRes = [
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
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  // Mock the franchise endpoint (general list)
  await page.route('*/**/api/franchise', async (route: Route) => {
    const franchiseRes = [
      {
        id: 5,
        name: 'LotaPizza',
        admins: [{ id: 3, name: 'franchisee', email: 'f@jwt.com' }],
        stores: [
          { id: 6, name: 'Lehi', totalRevenue: 0.1 },
          { id: 7, name: 'Springville', totalRevenue: 0.05 },
        ],
      },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  // Mock specific franchise details (user's franchise)
  await page.route('*/**/api/franchise/5', async (route: Route) => {
    const franchiseRes = {
      id: 5,
      name: 'LotaPizza',
      admins: [{ id: 3, name: 'franchisee', email: 'f@jwt.com' }],
      stores: [
        { id: 6, name: 'Lehi', totalRevenue: 0.1 },
        { id: 7, name: 'Springville', totalRevenue: 0.05 },
      ],
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  // Mock creating a new store
  await page.route('*/**/api/franchise/5/store', async (route: Route) => {
    const storeReq = route.request().postDataJSON();
    const storeRes = {
      id: 8,
      name: storeReq.name,
      totalRevenue: 0,
    };
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: storeRes });
  });

  // Mock the register/login endpoint - handle POST (register) and PUT (login)
  await page.route('*/**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
      return;
    }
    if (method === 'POST') {
      const registerReq = route.request().postDataJSON();
      const registerRes = {
        user: {
          id: 4,
          name: registerReq.name,
          email: registerReq.email,
          roles: [{ role: 'diner' }],
        },
        token: 'new-user-token',
      };
      await route.fulfill({ json: registerRes });
      return;
    }
    

    // Default: treat as login (PUT)
    const loginReq = route.request().postDataJSON();
    if (loginReq.email === 'd@jwt.com' && loginReq.password === 'diner') {
      const loginRes = {
        user: {
          id: 2,
          name: 'pizza diner',
          email: 'd@jwt.com',
          roles: [{ role: 'diner' }],
        },
        token: 'abcdef',
      };
      await route.fulfill({ json: loginRes });
    } else if (loginReq.email === 'f@jwt.com' && loginReq.password === 'franchisee') {
      const loginRes = {
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
      };
      await route.fulfill({ json: loginRes });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
  });

  // Mock the user/me endpoint - return appropriate user
  await page.route('*/**/api/user/me', async (route: Route) => {
    // Check if there's a franchisee token in the Authorization header
    const authHeader = route.request().headers()['authorization'];
    
    if (authHeader && authHeader.includes('franchisee-token')) {
      const userRes = {
        id: 3,
        name: 'franchisee',
        email: 'f@jwt.com',
        roles: [
          { role: 'diner' },
          { objectId: 5, role: 'franchisee' }
        ],
      };
      await route.fulfill({ json: userRes });
    } else {
      const userRes = {
        id: 2,
        name: 'pizza diner',
        email: 'd@jwt.com',
        roles: [{ role: 'diner' }],
      };
      await route.fulfill({ json: userRes });
    }
  });

  // Mock the order endpoint (GET history, POST create)
  await page.route('*/**/api/order', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const ordersRes = {
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
      };
      await route.fulfill({ json: ordersRes });
      return;
    }

    // POST create order
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: {
        items: orderReq.items,
        storeId: orderReq.storeId,
        franchiseId: orderReq.franchiseId,
        id: 23,
      },
      jwt: 'eyJpYXQ',
    };
    await route.fulfill({ json: orderRes });
  });

  await page.goto('/');
}

test('home page', async ({ page }) => {
  await basicInit(page);
  await expect(page).toHaveTitle('JWT Pizza');
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  
  // Select store and pizzas
  await page.getByRole('combobox').selectOption('6');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).first().click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).first().click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  
  // Checkout
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Login
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Verify order summary
  await expect(page.locator('tfoot')).toContainText('2 pies');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  
  // Complete payment
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('main')).toContainText('0.008 ₿');
});

test('docs page', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.getByRole('main')).toContainText('JWT Pizza API');
});

test('about page', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('main')).toContainText('The secret sauce');
});

test('history page', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('main')).toContainText('Mama Ricci');
});

test('404 page', async ({ page }) => {
  await page.goto('/invalid-route');
  await expect(page.getByRole('main')).toContainText('Oops');
});

test('register new user', async ({ page }) => {
  await basicInit(page);
  
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('test@jwt.com');
  await page.getByPlaceholder('Password').fill('testpass');
  await page.getByRole('button', { name: 'Register' }).click();
  
  await expect(page.getByRole('link', { name: 'TU' })).toBeVisible();
});

test('logout', async ({ page }) => {
  await basicInit(page);
  
  // First login
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Then logout
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('diner dashboard shows order history', async ({ page }) => {
  await basicInit(page);
  
  // Login
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await page.getByRole('link', { name: 'PD' }).click();
  
  await expect(page.getByText('Your pizza kitchen')).toBeVisible();
  
  await expect(page.locator('text=d@jwt.com')).toBeVisible();
});

test('failed login shows error', async ({ page }) => {
  await basicInit(page);
  
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('bad@jwt.com');
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Should show error message or stay on login page
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('admin dashboard functionality', async ({ page }) => {
  // Mock admin user
  await page.route('*/**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const loginReq = route.request().postDataJSON();
      if (loginReq.email === 'admin@jwt.com' && loginReq.password === 'admin') {
        const loginRes = {
          user: {
            id: 1,
            name: 'admin',
            email: 'admin@jwt.com',
            roles: [{ role: 'admin' }],
          },
          token: 'admin-token',
        };
        await route.fulfill({ json: loginRes });
      }
    }
  });

  await page.route('*/**/api/user/me', async (route: Route) => {
    const userRes = {
      id: 1,
      name: 'admin',
      email: 'admin@jwt.com',
      roles: [{ role: 'admin' }],
    };
    await route.fulfill({ json: userRes });
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
  await page.route('*/**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const loginReq = route.request().postDataJSON();
      if (loginReq.email === 'admin@jwt.com' && loginReq.password === 'admin') {
        const loginRes = {
          user: {
            id: 1,
            name: 'admin',
            email: 'admin@jwt.com',
            roles: [{ role: 'admin' }],
          },
          token: 'admin-token',
        };
        await route.fulfill({ json: loginRes });
      }
    }
  });

  await page.route('*/**/api/user/me', async (route: Route) => {
    const userRes = {
      id: 1,
      name: 'admin',
      email: 'admin@jwt.com',
      roles: [{ role: 'admin' }],
    };
    await route.fulfill({ json: userRes });
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
  
  // Just verify we can navigate to the create franchise page
  await expect(page.getByText('Want to create franchise?')).toBeVisible();
});

test('close franchise functionality', async ({ page }) => {
  // Mock admin user
  await page.route('*/**/api/auth', async (route: Route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const loginReq = route.request().postDataJSON();
      if (loginReq.email === 'admin@jwt.com' && loginReq.password === 'admin') {
        const loginRes = {
          user: {
            id: 1,
            name: 'admin',
            email: 'admin@jwt.com',
            roles: [{ role: 'admin' }],
          },
          token: 'admin-token',
        };
        await route.fulfill({ json: loginRes });
      }
    }
  });

  await page.route('*/**/api/user/me', async (route: Route) => {
    const userRes = {
      id: 1,
      name: 'admin',
      email: 'admin@jwt.com',
      roles: [{ role: 'admin' }],
    };
    await route.fulfill({ json: userRes });
  });

  await page.goto('/');
  
  // Login as admin
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('admin@jwt.com');
  await page.getByPlaceholder('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Go to admin dashboard and close franchise
  await page.getByRole('link', { name: 'AD' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  
  // Just verify we can navigate to the close franchise page
  await expect(page.getByText('Sorry to see you go')).toBeVisible();
});

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

test('payment page edge cases', async ({ page }) => {
  await basicInit(page);
  
  // Go to order page and add items
  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('6');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).first().click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Login
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Test payment page elements
  await expect(page.getByText('Payment')).toBeVisible();
});

test('register page edge cases', async ({ page }) => {
  await basicInit(page);
  
  await page.getByRole('link', { name: 'Register' }).click();
  
  // Test form validation
  await page.getByRole('button', { name: 'Register' }).click();
  
  // Should show validation errors or stay on form
  await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  
  // Test successful registration
  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('test@jwt.com');
  await page.getByPlaceholder('Password').fill('testpass');
  await page.getByRole('button', { name: 'Register' }).click();
  
  // Verify registration success
  await expect(page.getByRole('link', { name: 'TU' })).toBeVisible();
});

test('menu page edge cases', async ({ page }) => {
  await basicInit(page);
  
  // Go to menu page
  await page.getByRole('button', { name: 'Order now' }).click();
  
  // Test store selection
  await page.getByRole('combobox').selectOption('6');
  
  // Test pizza selection and removal
  await page.getByRole('link', { name: 'Image Description Veggie A' }).first().click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).first().click();
  
  // Verify items are selected
  await expect(page.getByText('Selected pizzas: 2')).toBeVisible();
  
  // Test checkout button
  await page.getByRole('button', { name: 'Checkout' }).click();
  
  // Should navigate to payment page
  await expect(page.getByText('Payment')).toBeVisible();
});

test('create store page navigation', async ({ page }) => {
  await basicInit(page);
  
  // Mock the franchise endpoint for the franchisee
  await page.route('*/**/api/franchise/3', async (route: Route) => {
    const franchiseRes = [{
      id: 5,
      name: 'LotaPizza',
      admins: [{ id: 3, name: 'franchisee', email: 'f@jwt.com' }],
      stores: [
        { id: 6, name: 'Lehi', totalRevenue: 0.1 },
        { id: 7, name: 'Springville', totalRevenue: 0.05 },
      ],
    }];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });
  
  // Login as franchisee
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('f@jwt.com');
  await page.getByPlaceholder('Password').fill('franchisee');
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Go to franchise dashboard
  await page.getByRole('link', { name: 'Franchise' }).first().click();
  
  // Click create store button
  await page.getByRole('button', { name: 'Create store' }).click();
  
  // Verify we're on the create store page
  await expect(page.getByText('Create store')).toBeVisible();
});


