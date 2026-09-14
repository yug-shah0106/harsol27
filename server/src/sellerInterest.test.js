import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from './sellerInterest.js';

test('accepts a valid submission and normalises it', () => {
  const { data, errors } = validate({
    name: ' Asha Mehta ',
    phoneNumber: '+91 98765-43210',
    email: 'Asha@Example.com',
    businessCategory: 'Retail',
  });
  assert.deepEqual(errors, {});
  assert.deepEqual(data, {
    name: 'Asha Mehta',
    phoneNumber: '+919876543210',
    email: 'asha@example.com',
    businessCategory: 'Retail',
  });
});

test('reports every missing field', () => {
  assert.deepEqual(Object.keys(validate(undefined).errors), ['name', 'phoneNumber', 'email', 'businessCategory']);
  assert.deepEqual(Object.keys(validate({ name: '   ' }).errors), ['name', 'phoneNumber', 'email', 'businessCategory']);
});

test('rejects bad phone and email formats', () => {
  const { errors } = validate({ name: 'A', phoneNumber: '12345', email: 'not-an-email', businessCategory: 'Retail' });
  assert.deepEqual(Object.keys(errors), ['phoneNumber', 'email']);
});
