import assert from "node:assert/strict";
import test from "node:test";
import { SCENES, ENTRANCES, DECORATIONS, EFFECT_COUNT, decodeEffect, encodeEffect,
  isSuitableEffect, normalizeRecent, pickEffect } from "../lib/effects/catalog.ts";
import { pickMemoryDay } from "../lib/memories/random-day.ts";

test("catalog has exactly one stable code for every scene, entrance and decoration", () => {
  assert.equal(SCENES.length, 10);
  assert.equal(ENTRANCES.length, 10);
  assert.equal(DECORATIONS.length, 10);
  assert.equal(EFFECT_COUNT, 1000);
  const codes = new Set();
  for (let scene = 0; scene < 10; scene++) for (let entrance = 0; entrance < 10; entrance++) for (let decoration = 0; decoration < 10; decoration++) {
    const code = encodeEffect(scene, entrance, decoration);
    assert.ok(code);
    assert.deepEqual([decodeEffect(code).scene, decodeEffect(code).entrance, decodeEffect(code).decoration], [scene, entrance, decoration]);
    codes.add(code);
  }
  assert.equal(codes.size, 1000);
  assert.equal(decodeEffect(0), null);
  assert.equal(decodeEffect(1001), null);
});

test("random selector avoids twenty recent codes and respects mobile/content limits", () => {
  const recent = Array.from({ length: 20 }, (_, index) => index + 1);
  for (const random of [0, .1, .5, .9, .999999999]) {
    const result = pickEffect(recent, { mobile: true, photoCount: 7 }, random);
    assert.ok(result);
    assert.equal(recent.includes(result.code), false);
    assert.equal(isSuitableEffect(result.code, { mobile: true, photoCount: 7 }), true);
    assert.equal(result.recent.length, 20);
    assert.equal(result.recent.at(-1), result.code);
  }
  assert.equal(isSuitableEffect(encodeEffect(0, 6, 0), { mobile: true, photoCount: 1 }), false);
  assert.equal(isSuitableEffect(encodeEffect(0, 6, 0), { mobile: false, photoCount: 1 }), true);
  assert.equal(isSuitableEffect(encodeEffect(0, 0, 7), { mobile: false, photoCount: 5 }), false);
});

test("favorite-only selection can reuse a single eligible favorite without losing history", () => {
  const favorite = encodeEffect(2, 1, 3);
  const result = pickEffect([favorite], { mobile: true, photoCount: 1 }, .5, [favorite]);
  assert.equal(result?.code, favorite);
  assert.deepEqual(result?.recent, [favorite]);
  assert.equal(pickEffect([], { mobile: true, photoCount: 1 }, .2, []), null);
  assert.deepEqual(normalizeRecent([0, 1, 1, 2, 1001]), [1, 2]);
});

test("day machine can revisit its only saved day", () => {
  const selected = pickMemoryDay(["2026-09-25"], ["2026-09-25"], .5);
  assert.equal(selected?.day, "2026-09-25");
  assert.deepEqual(selected?.recent, ["2026-09-25"]);
});
