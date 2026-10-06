import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../voice-demo.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../assets/js/voice-demo.js', import.meta.url), 'utf8');

test('the public demo offers only Evelyn and Marry, with Evelyn as default', () => {
  const options = [...html.matchAll(/<option value="(Agent-[^"]+)"([^>]*)>/g)];
  assert.deepEqual(options.map((match) => match[1]), [
    'Agent-1-Evelyn',
    'Agent-2-Marry',
  ]);
  assert.match(options[0][2], /\bselected\b/);
  assert.doesNotMatch(options[1][2], /\bselected\b/);
});

test('the selected agent is sent with session creation and locked while active', () => {
  assert.match(script, /body\.agent=\$\('agent'\)\.value/);
  assert.match(script, /\$\('agent'\)\.disabled=true/);
  assert.match(script, /\$\('agent'\)\.disabled=false/);
  assert.match(script, /veyronix-final-expense-demo-v3-agents/);
});
