
import { withValidation } from '@/lib/middleware/validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const mockHandler = jest.fn(async (req, context) => {
  return NextResponse.json({ success: true, ...context });
});

describe('withValidation Middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test successful body validation
  it('should validate the request body and call the handler with valid data', async () => {
    const schema = { body: z.object({ name: z.string() }) };
    const validatedHandler = withValidation(schema)(mockHandler);
    const req = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jules' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await validatedHandler(req, { params: {} });
    const json = await response.json();

    expect(mockHandler).toHaveBeenCalledWith(req, {
      body: { name: 'Jules' },
      query: undefined,
      params: {},
    });
    expect(json.success).toBe(true);
    expect(json.body.name).toBe('Jules');
  });

  // Test successful query validation
  it('should validate the query parameters and call the handler with valid data', async () => {
    const schema = { query: z.object({ id: z.string() }) };
    const validatedHandler = withValidation(schema)(mockHandler);
    const req = new Request('http://localhost/test?id=123');

    const response = await validatedHandler(req, { params: {} });
    const json = await response.json();

    expect(mockHandler).toHaveBeenCalledWith(req, {
      body: undefined,
      query: { id: '123' },
      params: {},
    });
    expect(json.success).toBe(true);
    expect(json.query.id).toBe('123');
  });

  // Test successful params validation
    it('should validate the route parameters and call the handler with valid data', async () => {
    const schema = { params: z.object({ userId: z.string() }) };
    const validatedHandler = withValidation(schema)(mockHandler);
    const req = new Request('http://localhost/test');

    const response = await validatedHandler(req, { params: { userId: 'user-456' } });
    const json = await response.json();

    expect(mockHandler).toHaveBeenCalledWith(req, {
      body: undefined,
      query: undefined,
      params: { userId: 'user-456' },
    });
    expect(json.success).toBe(true);
    expect(json.params.userId).toBe('user-456');
    });

  // Test Zod validation error
  it('should return a 400 error if validation fails', async () => {
    const schema = { body: z.object({ name: z.string() }) };
    const validatedHandler = withValidation(schema)(mockHandler);
    const req = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ name: 123 }), // Invalid type
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await validatedHandler(req, { params: {} });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors).toBeDefined();
    expect(mockHandler).not.toHaveBeenCalled();
  });

  // Test malformed JSON error
  it('should return a 400 error for malformed JSON', async () => {
    const schema = { body: z.object({ name: z.string() }) };
    const validatedHandler = withValidation(schema)(mockHandler);
    const req = new Request('http://localhost/test', {
      method: 'POST',
      body: '{ "name": "Jules", }', // Malformed JSON with trailing comma
      headers: { 'Content-Type': 'application/json' },
    });

    // Mock req.json() to throw a SyntaxError
    jest.spyOn(req, 'json').mockImplementation(async () => {
        throw new SyntaxError('Test SyntaxError');
    });

    const response = await validatedHandler(req, { params: {} });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.message).toBe('Invalid JSON in request body.');
    expect(mockHandler).not.toHaveBeenCalled();
    });
});
