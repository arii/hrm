// This file configures the Sentry Server SDK.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) : 1.0,
});
