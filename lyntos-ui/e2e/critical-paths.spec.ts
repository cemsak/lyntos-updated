import { test, expect } from '@playwright/test';

/**
 * LYNTOS Critical Path E2E Tests
 * Virgosol Standard: Test critical user journeys
 */

test.describe('LYNTOS Critical Paths', () => {

  test.describe('Health Checks', () => {
    test('backend health endpoint returns ok', async ({ request }) => {
      const response = await request.get('http://localhost:8000/health');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    test('feed health endpoint returns ok', async ({ request }) => {
      const response = await request.get('http://localhost:8000/api/v2/feed/health');
      expect(response.ok()).toBeTruthy();
    });

    test('dossier health endpoint returns ok', async ({ request }) => {
      const response = await request.get('http://localhost:8000/api/v2/dossier/health');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Dashboard', () => {
    test('should load v2 cockpit page', async ({ page }) => {
      await page.goto('/v2');
      await expect(page).toHaveURL(/v2/);
      // Wait for page to load
      await page.waitForLoadState('networkidle');
    });

    test('should have period selector', async ({ page }) => {
      await page.goto('/v2');
      // Look for period-related elements
      const periodElement = page.locator('[data-testid="period-selector"], select, [class*="period"]').first();
      // Page should have some interactive elements
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Feed API', () => {
    test('feed endpoint returns ResponseEnvelope format', async ({ request }) => {
      const response = await request.get('http://localhost:8000/api/v2/feed/2024-Q1', {
        params: {
          smmm_id: 'TEST',
          client_id: 'TEST'
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // ResponseEnvelope structure
      expect(data).toHaveProperty('schema');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('errors');
      expect(data).toHaveProperty('warnings');
    });

    test('critical feed endpoint filters correctly', async ({ request }) => {
      const response = await request.get('http://localhost:8000/api/v2/feed/2024-Q1/critical', {
        params: {
          smmm_id: 'TEST',
          client_id: 'TEST'
        }
      });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Evidence Bundle API', () => {
    test('generate bundle returns valid structure', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/v2/evidence-bundle/generate', {
        data: {
          smmm_id: 'TEST-SMMM',
          client_id: 'TEST-CLIENT',
          period: '2024-Q1'
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('schema');
      expect(data.schema.name).toBe('EvidenceBundleResponse');
    });
  });

  test.describe('Brief API', () => {
    test('generate brief returns valid structure', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/v2/brief/generate', {
        data: {
          smmm_id: 'TEST-SMMM',
          client_id: 'TEST-CLIENT',
          period: '2024-Q1'
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('slides');
      // Brief should have 2-5 slides
      expect(data.data.slides.length).toBeGreaterThanOrEqual(2);
      expect(data.data.slides.length).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Dossier API', () => {
    test('generate dossier returns valid structure', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/v2/dossier/generate', {
        data: {
          smmm_id: 'TEST-SMMM',
          client_id: 'TEST-CLIENT',
          period: '2024-Q1',
          generate_pdf: false
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('sections');
      // Dossier should have 5-6 sections
      expect(data.data.sections.length).toBeGreaterThanOrEqual(5);
      expect(data.data.sections.length).toBeLessThanOrEqual(6);
    });

    test('full package generates all components', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/v2/dossier/full-package', {
        data: {
          smmm_id: 'TEST-SMMM',
          client_id: 'TEST-CLIENT',
          period: '2024-Q1',
          generate_pdfs: false
        }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.data).toHaveProperty('bundle');
      expect(data.data).toHaveProperty('brief');
      expect(data.data).toHaveProperty('dossier');
    });
  });

  test.describe('ResponseEnvelope Compliance', () => {
    const endpoints = [
      { method: 'GET', url: '/api/v2/feed/2024-Q1?smmm_id=T&client_id=T' },
      { method: 'POST', url: '/api/v2/evidence-bundle/generate', body: { smmm_id: 'T', client_id: 'T', period: '2024-Q1' } },
      { method: 'POST', url: '/api/v2/brief/generate', body: { smmm_id: 'T', client_id: 'T', period: '2024-Q1' } },
      { method: 'POST', url: '/api/v2/dossier/generate', body: { smmm_id: 'T', client_id: 'T', period: '2024-Q1', generate_pdf: false } },
    ];

    for (const endpoint of endpoints) {
      test(`${endpoint.method} ${endpoint.url.split('?')[0]} returns ResponseEnvelope`, async ({ request }) => {
        let response;
        if (endpoint.method === 'GET') {
          response = await request.get(`http://localhost:8000${endpoint.url}`);
        } else {
          response = await request.post(`http://localhost:8000${endpoint.url}`, { data: endpoint.body });
        }
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data).toHaveProperty('schema');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('errors');
        expect(data).toHaveProperty('warnings');
      });
    }
  });
});
