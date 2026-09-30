import test from 'node:test';
import assert from 'node:assert/strict';
import { apiKeyAuth } from '../src/middleware/api-key-auth.js';

const expected = 'test_api_key_with_at_least_32_characters';

function invoke(headerValue) {
  let statusCode;
  let body;
  let nextCalled = false;
  const req = { get: () => headerValue };
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; }
  };
  apiKeyAuth(expected)(req, res, () => { nextCalled = true; });
  return { statusCode, body, nextCalled };
}

test('aceita uma chave de API válida', () => {
  const result = invoke(expected);
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, undefined);
});

test('recusa requisição sem chave de API', () => {
  const result = invoke(undefined);
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { erro: 'Chave de API não informada' });
});

test('recusa chave de API inválida', () => {
  const result = invoke('chave-incorreta');
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { erro: 'Chave de API inválida' });
});
