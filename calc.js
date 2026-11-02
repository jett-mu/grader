/*
 * KTCA gradebook math. Pure functions, no DOM.
 * All percentages are returned as fractions (0.93 = 93%).
 * Works in the browser (window.Calc) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var CATS = ['K', 'T', 'C', 'A'];
  var CAT_NAMES = { K: 'Knowledge', T: 'Thinking', C: 'Communication', A: 'Application' };

  function num(x) {
    var n = Number(x);
    return isFinite(n) ? n : 0;
  }

  // Fraction earned in one category of an assessment, or null if not assessed.
  function scorePct(score) {
    if (!score) return null;
    var total = num(score.total);
    if (total <= 0) return null;
    return num(score.earned) / total;
  }

  // Categories an assessment actually includes (has a valid score for).
  function presentCats(assessment) {
    return CATS.filter(function (c) {
      return scorePct(assessment.scores && assessment.scores[c]) !== null;
    });
  }

  // Rescale weights over the given categories so they sum to 1.
  // Categories with weight <= 0 are dropped. Returns {} if nothing usable.
  function normalize(weights, cats) {
    cats = cats || CATS;
    var sum = 0;
    cats.forEach(function (c) {
      var w = num(weights[c]);
      if (w > 0) sum += w;
    });
    var out = {};
    if (sum <= 0) return out;
    cats.forEach(function (c) {
      var w = num(weights[c]);
      if (w > 0) out[c] = w / sum;
    });
    return out;
  }

  // Combine per-category fractions {K: .9, T: null, ...} with category weights.
  function combine(pcts, weights) {
    var cats = CATS.filter(function (c) {
      return pcts[c] !== null && pcts[c] !== undefined;
    });
    var norm = normalize(weights, cats);
    var keys = Object.keys(norm);
    if (!keys.length) return null;
    return keys.reduce(function (acc, c) {
      return acc + pcts[c] * norm[c];
    }, 0);
  }

  // One assessment's own overall mark, using only the categories it covers.
  function assessmentMark(assessment, weights) {
    var pcts = {};
    CATS.forEach(function (c) {
      pcts[c] = scorePct(assessment.scores && assessment.scores[c]);
    });
    return combine(pcts, weights);
  }

  // Per-category average across assessments, weighted by assessment weight.
  function categoryAverages(subject) {
    var out = {};
    CATS.forEach(function (c) {
      var sum = 0;
      var wsum = 0;
      (subject.assessments || []).forEach(function (a) {
        var p = scorePct(a.scores && a.scores[c]);
        var w = num(a.weight);
        if (p === null || w <= 0) return;
        sum += p * w;
        wsum += w;
      });
      out[c] = wsum > 0 ? sum / wsum : null;
    });
    return out;
  }

  // Headline mark: average each category first, then combine with category weights.
  function finalMark(subject) {
    return combine(categoryAverages(subject), subject.weights || {});
  }

  // Reference mark: weighted average of each assessment's own mark.
  function assessmentWeightedAverage(subject) {
    var sum = 0;
    var wsum = 0;
    (subject.assessments || []).forEach(function (a) {
      var m = assessmentMark(a, subject.weights || {});
      var w = num(a.weight);
      if (m === null || w <= 0) return;
      sum += m * w;
      wsum += w;
    });
    return wsum > 0 ? sum / wsum : null;
  }

  var Calc = {
    CATS: CATS,
    CAT_NAMES: CAT_NAMES,
    scorePct: scorePct,
    presentCats: presentCats,
    normalize: normalize,
    combine: combine,
    assessmentMark: assessmentMark,
    categoryAverages: categoryAverages,
    finalMark: finalMark,
    assessmentWeightedAverage: assessmentWeightedAverage,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  else root.Calc = Calc;
})(typeof window !== 'undefined' ? window : this);
