// 使い方: node tools/encrypt.mjs <qc.keyのパス>
// content.js の中身を暗号化して content.bin を作る（鍵は qcKey と同じ base64 の32バイト）
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
const keyB64 = readFileSync(process.argv[2], 'utf8').trim();
const src = readFileSync(new URL('../content.js', import.meta.url), 'utf8');
const json = src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1);
JSON.parse(json);
const key = await crypto.subtle.importKey('raw', Buffer.from(keyB64, 'base64'), 'AES-GCM', false, ['encrypt']);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(json)));
writeFileSync(new URL('../content.bin', import.meta.url), Buffer.concat([iv, ct]));
console.log('content.bin', iv.length + ct.length, 'bytes');
