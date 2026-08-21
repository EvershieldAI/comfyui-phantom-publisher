import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';

// The publisher's web assets ship unbundled to a user's ComfyUI install, so
// there is nothing to import — the suites assert against the source text. One
// entry point for both, so a rename of the assets breaks in one place.
const JS = new URL('./web/phantom-publisher.js', import.meta.url);
const CSS = new URL('./web/phantom-publisher.css', import.meta.url);

let js = '';
let css = '';

before(async () => {
  [js, css] = await Promise.all([readFile(JS, 'utf8'), readFile(CSS, 'utf8')]);
});

const contains = (source, needle) =>
  assert.ok(source.includes(needle), `expected the source to contain ${JSON.stringify(needle)}`);

const matches = (source, pattern) =>
  assert.ok(pattern.test(source), `expected the source to match ${pattern}`);

const excludes = (source, needle) =>
  assert.ok(!source.includes(needle), `expected the source NOT to contain ${JSON.stringify(needle)}`);

describe('Phantom publisher progress UI', () => {
  it('shows detailed overall and per-dependency upload progress', () => {
    contains(js, 'Workflow dependencies');
    contains(js, 'dependency.uploaded_bytes');
    contains(js, 'dependency.byte_size');
    contains(js, 'Already in Phantom');
    contains(js, 'dependencies processed');
    contains(js, 'Publish activity log');
    contains(js, 'updateLogRows(job.logs)');
    contains(
      js,
      'showProgress(job.job_id, config.console_origin, target.slug, idempotencyStorageKey)',
    );
    contains(js, 'Phantom console origin');
    matches(js, /job\.status === 'failed'[\s\S]*?logDetails\.open = true/);
    contains(css, '.phantom-publisher-dependency-progress');
    contains(css, "[data-status='uploading']");
    contains(css, '.phantom-publisher-log-entry');
    contains(css, "[data-level='error']");
    matches(css, /\.phantom-publisher-progress-dialog > \*\s*{\s*min-width: 0/);
    matches(css, /\.phantom-publisher-phase\s*{\s*overflow-wrap: anywhere/);
  });
});

describe('Phantom publisher target confirmation', () => {
  it('confirms a remembered Phantom workflow before publishing a new version', () => {
    assert.ok(
      !/if \(rememberedTarget\) return rememberedTarget/.test(js),
      'a remembered target must still be confirmed, not returned unchecked',
    );
    matches(js, /select\.value = rememberedTarget\?\.workflow_id \|\| ''/);
    contains(js, 'Workflow in Phantom');
    contains(js, 'Publishing will add a new version to the selected workflow');
    contains(js, "submit.textContent = publishingNewVersion ? 'Publish new version'");
    contains(js, 'nameField.hidden = publishingNewVersion');
    contains(js, 'slugField.hidden = publishingNewVersion');
    contains(js, 'providerField.hidden = publishingNewVersion');
    matches(css, /\.phantom-publisher-field\[hidden\]\s*{\s*display: none/);
  });

  it('keeps the new-target fields intact by hiding them, not clearing them', () => {
    // No draft save/restore: an <input> inside a `hidden` container keeps its
    // value, so switching back to "new workflow" finds what was typed.
    excludes(js, 'newTargetDraft');
    excludes(js, 'showingNewTarget');
  });
});
