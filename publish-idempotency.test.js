import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fingerprintPublishPayload,
  selectPendingIdempotencyKey,
} from './web/publish-idempotency.js';

describe('Phantom publisher idempotency', () => {
  it('reuses a pending key only for identical manifest content', async () => {
    const first = await fingerprintPublishPayload({ workflow: { '2': 'b', '1': 'a' } });
    const same = await fingerprintPublishPayload({ workflow: { '1': 'a', '2': 'b' } });
    const changed = await fingerprintPublishPayload({ workflow: { '1': 'edited', '2': 'b' } });
    const stored = JSON.stringify({ idempotencyKey: 'pending-key', manifestFingerprint: first });

    assert.equal(selectPendingIdempotencyKey(stored, same, () => 'new-key'), 'pending-key');
    assert.equal(selectPendingIdempotencyKey(stored, changed, () => 'new-key'), 'new-key');
  });

  it('rotates legacy raw-key storage because its content identity is unknown', () => {
    assert.equal(selectPendingIdempotencyKey('legacy-key', 'fingerprint', () => 'new-key'), 'new-key');
  });
});
