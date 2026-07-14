import { test, expect } from '@playwright/test';

test.describe('ToolCard rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:4173/', { timeout: 10000 });
    // Wait for the app to load
    await page.waitForSelector('#root', { timeout: 10000 });
  });

  test('app loads successfully', async ({ page }) => {
    const title = await page.title();
    // Title contains the pi symbol (π)
    expect(title).toBe('π test');
    
    const rootDiv = await page.$('#root');
    expect(rootDiv).toBeTruthy();
  });

  test('verifies page is responsive', async ({ page }) => {
    // Just verify we can interact with the page
    const body = await page.$('body');
    expect(body).toBeTruthy();
  });

  test('ToolCard starts collapsed by default', async ({ page }) => {
    // Send a command that produces a tool result
    const textbox = page.getByRole('textbox', { name: /message pi/ });
    await textbox.fill('read_file /Users/laurent/Projets/Pi-interface/package.json');
    await textbox.press('Enter');
    
    // Wait for tool card to appear
    const toolButton = page.getByRole('button', { name: /read.*package\.json/ });
    await expect(toolButton).toBeVisible();
    
    // Check that it has the collapsed indicator (▸)
    const collapsedIndicator = toolButton.getByText('▸');
    await expect(collapsedIndicator).toBeVisible();
  });

  test('ToolCard expands when clicked', async ({ page }) => {
    // Send a command that produces a tool result
    const textbox = page.getByRole('textbox', { name: /message pi/ });
    await textbox.fill('read_file /Users/laurent/Projets/Pi-interface/package.json');
    await textbox.press('Enter');
    
    // Wait for tool card to appear
    const toolButton = page.getByRole('button', { name: /read.*package\.json/ });
    await expect(toolButton).toBeVisible();
    
    // Click to expand
    await toolButton.click();
    
    // Check that it now has the expanded indicator (▾)
    const expandedIndicator = toolButton.getByText('▾');
    await expect(expandedIndicator).toBeVisible();
    
    // Check that raw JSON is visible when expanded
    const preElement = page.locator('pre').filter({ hasText: /"name"/ });
    await expect(preElement).toBeVisible();
  });
});
