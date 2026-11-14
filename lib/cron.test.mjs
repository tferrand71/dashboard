// Tests des fonctions de mise en forme de lib/cron.ts. Lancer : npm test (Node 24 exécute le TypeScript tel quel).
import test from "node:test";
import assert from "node:assert/strict";
import { describeRecurrence, formatIn, formatWhen, outcomeTone, scheduleTime } from "./cron.ts";

const PARIS = "Europe/Paris";

test("formatWhen : heure de Paris, hiver (UTC+1) et été (UTC+2)", () => {
    assert.equal(formatWhen("2026-11-15T02:00:00.000Z", PARIS), "dim. 15 nov. à 03:00");
    assert.equal(formatWhen("2026-07-15T01:00:00.000Z", PARIS), "mer. 15 juil. à 03:00");
});

test("formatWhen : une heure UTC tardive tombe le lendemain à Paris", () => {
    assert.equal(formatWhen("2026-11-14T23:30:00.000Z", PARIS), "dim. 15 nov. à 00:30");
});

test("formatWhen : les nuits de changement d'heure restent justes", () => {
    // 29 mars 2026 : 3 h existe encore (UTC+2) → 01:00 UTC
    assert.equal(formatWhen("2026-03-29T01:00:00.000Z", PARIS), "dim. 29 mars à 03:00");
    // 25 octobre 2026 : 03:30 existe une fois (UTC+1) → 02:30 UTC
    assert.equal(formatWhen("2026-10-25T02:30:00.000Z", PARIS), "dim. 25 oct. à 03:30");
});

test("formatIn", () => {
    assert.equal(formatIn(-5_000), "imminent");
    assert.equal(formatIn(0), "imminent");
    assert.equal(formatIn(30_000), "dans moins d'une minute");
    assert.equal(formatIn(2 * 60_000), "dans 2 min");
    assert.equal(formatIn((10 * 60 + 8) * 60_000), "dans 10 h 08 min");
    assert.equal(formatIn(3 * 3_600_000), "dans 3 h");
    assert.equal(formatIn(27 * 3_600_000), "dans 1 j 3 h");
    assert.equal(formatIn(48 * 3_600_000), "dans 2 j");
});

test("describeRecurrence : chaque jour, chaque jour de la semaine, sinon l'expression brute", () => {
    assert.equal(describeRecurrence("0 3 * * *"), "Chaque jour à 03:00");
    assert.equal(describeRecurrence("30 22 * * *"), "Chaque jour à 22:30");
    assert.equal(describeRecurrence("0 3 * * 1"), "Chaque lundi à 03:00");
    assert.equal(describeRecurrence("0 3 * * 0"), "Chaque dimanche à 03:00");
    assert.equal(describeRecurrence("0 3 * * 7"), "Chaque dimanche à 03:00");
    assert.equal(describeRecurrence("0 */6 * * *"), "Cron 0 */6 * * *");
    assert.equal(describeRecurrence("0 3 1 * *"), "Cron 0 3 1 * *");
});

test("outcomeTone : un succès est vert, un échec rouge, le reste orange", () => {
    assert.equal(outcomeTone("succès"), "ok");
    assert.equal(outcomeTone("échec"), "down");
    for (const o of ["déployé, site injoignable", "manqué", "interrompu"]) assert.equal(outcomeTone(o), "warn", o);
    assert.equal(outcomeTone("autre chose"), "neutral");
});

test("scheduleTime : runAt pour une fois, nextRun pour une récurrente, null s'il n'y en a plus", () => {
    assert.equal(scheduleTime({ kind: "once", runAt: "A" }), "A");
    assert.equal(scheduleTime({ kind: "cron", nextRun: "B" }), "B");
    assert.equal(scheduleTime({ kind: "cron", nextRun: null }), null);
    assert.equal(scheduleTime({ kind: "once" }), null);
});
