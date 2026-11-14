// Tests du relais vers deploy-cron : jeton, encodage du chemin, et traduction des erreurs.
import test from "node:test";
import assert from "node:assert/strict";
import { forwardToService } from "./service-proxy.ts";

const BASE = { baseUrl: "http://svc:3002", token: "t".repeat(64), label: "deploy-cron", search: "" };
const reply = (status, body) => async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** fetch simulé qui garde ce qu'il a reçu */
function spy(handler) {
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        return handler(url, init);
    };
    return { fetchImpl, calls };
}

test("envoie le jeton en Bearer et relaie la réponse JSON telle quelle", async () => {
    const { fetchImpl, calls } = spy(reply(200, { schedules: [] }));
    const r = await forwardToService({ ...BASE, method: "GET", path: ["schedules"], fetchImpl });
    assert.deepEqual(r, { status: 200, body: { schedules: [] } });
    assert.equal(calls[0].url, "http://svc:3002/schedules");
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${BASE.token}`);
    assert.equal(calls[0].init.headers["Content-Type"], undefined, "pas de Content-Type sans corps");
});

test("corps : Content-Type JSON seulement quand il y en a un ; la chaîne de requête suit le chemin", async () => {
    const { fetchImpl, calls } = spy(reply(201, { schedule: { id: "a" } }));
    await forwardToService({ ...BASE, method: "POST", path: ["schedules"], search: "?x=1", body: '{"a":1}', fetchImpl });
    assert.equal(calls[0].url, "http://svc:3002/schedules?x=1");
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
    assert.equal(calls[0].init.body, '{"a":1}');
});

test("chaque segment du chemin est encodé : impossible de remonter dans l'arborescence", async () => {
    const { fetchImpl, calls } = spy(reply(404, { error: "x" }));
    await forwardToService({ ...BASE, method: "DELETE", path: ["schedules", "../../health", "a b"], fetchImpl });
    assert.equal(calls[0].url, "http://svc:3002/schedules/..%2F..%2Fhealth/a%20b");
});

test("les erreurs métier du service (400, 404…) sont relayées avec leur statut et leur message", async () => {
    for (const status of [400, 404, 413, 502]) {
        const { fetchImpl } = spy(reply(status, { error: "message du service" }));
        const r = await forwardToService({ ...BASE, method: "POST", path: ["schedules"], body: "{}", fetchImpl });
        assert.deepEqual(r, { status, body: { error: "message du service" } }, `HTTP ${status}`);
    }
});

test("204 : pas de corps", async () => {
    const { fetchImpl } = spy(async () => new Response(null, { status: 204 }));
    assert.deepEqual(await forwardToService({ ...BASE, method: "DELETE", path: ["schedules", "a"], fetchImpl }), { status: 204 });
});

test("401 du service = jeton refusé : renvoyé en 502, jamais en 401 (sinon l'interface croirait la session expirée)", async () => {
    const { fetchImpl } = spy(reply(401, { error: "Non autorisé" }));
    const r = await forwardToService({ ...BASE, method: "GET", path: ["schedules"], fetchImpl });
    assert.equal(r.status, 502);
    assert.match(r.body.error, /deploy-cron a refusé le jeton/);
});

test("service injoignable ou trop lent : 502 avec un message clair, sans détail technique", async () => {
    const down = await forwardToService({ ...BASE, method: "GET", path: ["schedules"], fetchImpl: async () => { throw new TypeError("fetch failed: ECONNREFUSED 10.0.0.5:3002"); } });
    assert.deepEqual(down, { status: 502, body: { error: "deploy-cron injoignable" } }, "l'adresse interne ne fuit pas");
    const slow = await forwardToService({ ...BASE, method: "GET", path: ["schedules"], timeoutMs: 20, fetchImpl: (_, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("timeout")))) });
    assert.equal(slow.status, 502);
});

test("réponse qui n'est pas du JSON (page d'erreur d'un proxy…) : 502", async () => {
    const { fetchImpl } = spy(async () => new Response("<html>Bad gateway</html>", { status: 200 }));
    const r = await forwardToService({ ...BASE, method: "GET", path: ["schedules"], fetchImpl });
    assert.equal(r.status, 502);
    assert.match(r.body.error, /Réponse invalide de deploy-cron/);
});
