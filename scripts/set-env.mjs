import { writeFileSync } from 'node:fs';
let url = (process.env.API_URL || '').trim().replace(/\/+$/, '');
if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
writeFileSync(new URL('../src/app/env.ts', import.meta.url), `export const API_URL: string = ${JSON.stringify(url)};\n`);
console.log('API_URL =', url || '(same origin)');
