import { http, HttpResponse } from 'msw';

/**
 * MSW request handlers used to stub network calls in tests. Covers auth, charity, and
 * donation endpoints with deterministic mock responses.
 */
export const handlers = [
  // Auth endpoints
  http.post('/auth/login', async ({ request }) => {
    const { email } = await request.json();
    if (email === 'test@example.com') {
      return HttpResponse.json({
        user: { id: '1', email },
        session: { token: 'mock-token' }
      });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  // Charity endpoints
  http.get('/api/charities', () => {
    return HttpResponse.json({
      data: [
        {
          id: '1',
          name: 'Test Charity',
          description: 'Test Description',
          category: 'Education',
          verified: true
        }
      ],
      metadata: {
        total: 1,
        page: 1,
        limit: 10
      }
    });
  }),

  // Donation endpoints
  http.post('/api/donations', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: '1',
      ...body,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  })
];