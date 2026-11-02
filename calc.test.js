const test = require('node:test');
const assert = require('node:assert');
const Calc = require('./calc.js');

const close = (actual, expected, eps = 1e-5) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

const W = { K: 0.225, T: 0.15, C: 0.15, A: 0.225 }; // sums to 0.75

const full = {
  name: 'Unit test', weight: 1,
  scores: { K: { earned: 12, total: 12 }, T: { earned: 6, total: 7 },
            C: { earned: 5.6, total: 7 }, A: { earned: 7, total: 7 } },
};
const kt = {
  name: 'Quiz', weight: 7.5,
  scores: { K: { earned: 8, total: 10 }, T: { earned: 3, total: 5 }, C: null, A: null },
};
const aOnly = {
  name: 'Lab', weight: 12.12,
  scores: { K: null, T: null, C: null, A: { earned: 9, total: 10 } },
};
const subject = { name: 'Physics', weights: W, assessments: [full, kt, aOnly] };

test('normalize rescales weights that do not sum to 1', () => {
  const n = Calc.normalize(W);
  close(n.K, 0.3); close(n.T, 0.2); close(n.C, 0.2); close(n.A, 0.3);
});

test('normalize over a subset of categories', () => {
  const n = Calc.normalize(W, ['K', 'T']);
  close(n.K, 0.6); close(n.T, 0.4);
  assert.strictEqual(n.C, undefined);
});

test('zero-weight categories are ignored', () => {
  const n = Calc.normalize({ K: 1, T: 0, C: 1, A: 2 });
  close(n.K, 0.25); close(n.C, 0.25); close(n.A, 0.5);
  assert.strictEqual(n.T, undefined);
});

test('example assessment 12/12, 6/7, 5.6/7, 7/7', () => {
  // (.225*1 + .15*6/7 + .15*.8 + .225*1) / .75
  close(Calc.assessmentMark(full, W), 0.931429);
});

test('two-category and one-category assessments rescale over what they cover', () => {
  close(Calc.assessmentMark(kt, W), 0.72);   // (.225*.8 + .15*.6) / .375
  close(Calc.assessmentMark(aOnly, W), 0.9);
});

test('category averages are weighted by assessment weight', () => {
  const avg = Calc.categoryAverages(subject);
  close(avg.K, 7 / 8.5);
  close(avg.T, (6 / 7 + 0.6 * 7.5) / 8.5);
  close(avg.C, 0.8);
  close(avg.A, (1 + 0.9 * 12.12) / 13.12);
});

test('final mark (category-first) vs assessment-weighted average', () => {
  close(Calc.finalMark(subject), 0.805396);
  close(Calc.assessmentWeightedAverage(subject), 0.836054);
});

test('missing category is excluded from final mark', () => {
  const s = { weights: W, assessments: [kt] };
  close(Calc.finalMark(s), 0.72);
  assert.strictEqual(Calc.categoryAverages(s).C, null);
});

test('empty subject returns null', () => {
  assert.strictEqual(Calc.finalMark({ weights: W, assessments: [] }), null);
  assert.strictEqual(Calc.assessmentWeightedAverage({ weights: W, assessments: [] }), null);
});
