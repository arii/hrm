// This file configures the Sentry Edge SDK.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE) : 1.0,
});
