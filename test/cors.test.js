import test from 'node:test';
import assert from 'node:assert/strict';
import { cors } from '../src/middleware/cors.js';

function invoke({ origin, method = 'GET' }) {
  const headers = {};
  let nextCalled = false;
  let status;
  const req = { method, get: (name) => name === 'Origin' ? origin : undefined };
  const res = {
    setHeader: (name, value) => { headers[name] = value; },
    sendStatus: (value) => { status = value; },
  };
  cors('http://localhost:8080,https://app.example.com')(req, res, () => { nextCalled = true; });
  return { headers, nextCalled, status };
}

test('CORS permite a origem configurada e o cabeçalho X-API-Key', () => {
  const result = invoke({ origin: 'http://localhost:8080' });
  assert.equal(result.nextCalled, true);
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'http://localhost:8080');
  assert.match(result.headers['Access-Control-Allow-Headers'], /X-API-Key/);
});

test('CORS não libera uma origem desconhecida', () => {
  const result = invoke({ origin: 'https://site-nao-autorizado.example' });
  assert.equal(result.nextCalled, true);
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
});

test('CORS responde ao preflight', () => {
  const result = invoke({ origin: 'http://localhost:8080', method: 'OPTIONS' });
  assert.equal(result.status, 204);
  assert.equal(result.nextCalled, false);
});
