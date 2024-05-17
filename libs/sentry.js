const Sentry = require("@sentry/node");
const { SENTRY_DSN, ENV } = process.env;

Sentry.init({
  environment: ENV,
  dsn: SENTRY_DSN,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app: require("express") }),
  ],
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
});

module.exports = Sentry;
