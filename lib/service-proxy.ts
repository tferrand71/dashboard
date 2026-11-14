/**
 * Relais d'une requête du dashboard vers un service interne du VPS (deploy-cron…), avec le jeton
 * AGENT_API_TOKEN. Fonction pure, sans Next : la route qui l'appelle vérifie la session du dashboard
 * avant, et transforme le résultat en réponse HTTP après.
 */

export type ForwardInput = {
    method: string;
    /** Segments du chemin déjà découpés (ils sont encodés ici). */
    path: string[];
    /** Chaîne de requête, avec son « ? » (vide s'il n'y en a pas). */
    search: string;
    body?: string;
    baseUrl: string;
    token: string;
    /** Nom du service, pour les messages d'erreur : « deploy-cron injoignable ». */
    label: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
};

export type ForwardResult = { status: number; body?: unknown };

export async function forwardToService({
    method,
    path,
    search,
    body,
    baseUrl,
    token,
    label,
    fetchImpl = fetch,
    timeoutMs = 20_000,
}: ForwardInput): Promise<ForwardResult> {
    const url = `${baseUrl}/${path.map(encodeURIComponent).join("/")}${search}`;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    // Fastify et Node refusent un Content-Type JSON accompagné d'un corps vide
    if (body) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
        res = await fetchImpl(url, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
        return { status: 502, body: { error: `${label} injoignable` } };
    }

    // 401 du service = jeton refusé (mal copié, changé d'un côté seulement). On le distingue d'une session
    // expirée du dashboard, sinon l'interface renverrait l'utilisateur sur la page de connexion.
    if (res.status === 401) {
        return { status: 502, body: { error: `${label} a refusé le jeton du dashboard (AGENT_API_TOKEN)` } };
    }
    if (res.status === 204) return { status: 204 };

    try {
        return { status: res.status, body: await res.json() };
    } catch {
        return { status: 502, body: { error: `Réponse invalide de ${label}` } };
    }
}
