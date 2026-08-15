import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const PASSWORD = (process.env.PORTFOLIO_PASS || 'uxfolio2026').trim().toLowerCase();
const ITERATIONS = 150000;

const src = readFileSync(new URL('./src.html', import.meta.url), 'utf8');
const start = src.indexOf('<!-- CONTENT_START -->');
const end = src.indexOf('<!-- CONTENT_END -->');
if (start === -1 || end === -1) throw new Error('Content markers not found in src.html');

const content = src.slice(start + '<!-- CONTENT_START -->'.length, end);
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(PASSWORD, salt, ITERATIONS, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();

const payload = JSON.stringify({
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ct: Buffer.concat([encrypted, tag]).toString('base64'),
});

let out = src
  .replace(/<!-- CONTENT_START -->[\s\S]*?<!-- CONTENT_END -->/m, '')
  .replace('__PAYLOAD__', payload);

writeFileSync(new URL('./index.html', import.meta.url), out);
console.log(`index.html built OK (payload ${Buffer.byteLength(payload)} bytes, content ${Buffer.byteLength(content)} bytes)`);
