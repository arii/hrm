import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type ValidatedData<T extends z.ZodTypeAny> = z.infer<T>;

export function withValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (req: NextRequest, data: ValidatedData<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const parsed = schema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.errors },
          { status: 400 }
        );
      }

      return handler(req, parsed.data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
  };
}
