const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateSingleAdminRegistration,
  validatePasswordConfirmation
} = require('./authService');

test('allows the first admin registration when no admin exists', () => {
  assert.doesNotThrow(() => validateSingleAdminRegistration({ role_id: 14 }, null));
});

test('rejects a second admin registration when one already exists', () => {
  assert.throws(
    () => validateSingleAdminRegistration({ role_id: 14 }, { user_id: 'existing-admin', role_id: 14 }),
    {
      message: 'Only one system admin is allowed.'
    }
  );
});

test('does not restrict non-admin role registrations', () => {
  assert.doesNotThrow(() => validateSingleAdminRegistration({ role_id: 5 }, null));
});

test('accepts matching registration passwords', () => {
  assert.doesNotThrow(() => validatePasswordConfirmation('password', 'password'));
});

test('rejects mismatched or missing confirmation passwords', () => {
  assert.throws(() => validatePasswordConfirmation('password', 'different'), {
    message: 'Passwords do not match.'
  });
  assert.throws(() => validatePasswordConfirmation('password', ''), {
    message: 'Passwords do not match.'
  });
});
