import nconf from 'nconf';

export const initNconf = () => {
  //
  // 1. any overrides
  //
  nconf.overrides({
    // always: "be this value",
  });

  //
  // 2. Environment variables, `process.env`
  // 3. Command-line arguments, `process.argv`
  //
  // nconf.argv().env();

  //
  // 4. Values in `localonfig.json`
  //
  nconf.file({ file: 'config/localConfig.json' });
  nconf.required([
    'checker:itemStatusLink',
    'checker:itemStatusSelector',
    'emailer:gmailSenderUsername',
    'emailer:gmailSenderPassword',
    'emailer:emailReceiver',
  ]);

  //
  // 5. Any default values
  //
  nconf.defaults({
    checker: {
      baseDelay: 30000, // Check status as frequently as `baseDelay`.
      maxDelay: 60000 * 5, // Grow the delay by `growthRate` up to `maxDelay` if the status doesn't change between checks.
      growthRate: 1.07,
    },
    emailer: {
      throttleBy: 60000 * 5, // Don't send more than 1 email per `throttleBy` minutes.  Useful if item status toggles very frequently.
    },
  });
};
