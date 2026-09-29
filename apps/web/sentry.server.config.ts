import * as Sentry from "@sentry/nextjs";
import { getSentryEnvironment } from "@/lib/sentry";

Sentry.init({
  dsn: "https://eec617f779cd9df7b34a8f9701d97e82@o4511585856258048.ingest.us.sentry.io/4511585880834048",
  environment: getSentryEnvironment(),
  tracesSampleRate: 0.1,
});
