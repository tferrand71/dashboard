"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PollState<T> = {
    data: T | null;
    error: string | null;
    updatedAt: Date | null;
    refresh: () => Promise<void>;
};

/**
 * Interroge une route /api/deploy/* à intervalle régulier.
 * En pause quand l'onglet est masqué : inutile de solliciter le VPS
 * pour une page que personne ne regarde.
 */
export function usePoll<T>(
    path: string,
    intervalMs: number,
    onData?: (data: T) => void,
): PollState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const onDataRef = useRef(onData);
    useEffect(() => {
        onDataRef.current = onData;
    });

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(path, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = (await res.json()) as T;
            setData(json);
            setError(null);
            setUpdatedAt(new Date());
            onDataRef.current?.(json);
        } catch {
            setError("deploy-agent injoignable");
        }
    }, [path]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        const start = () => {
            clearInterval(timer);
            timer = setInterval(refresh, intervalMs);
        };
        const onVisibility = () => {
            if (document.hidden) {
                clearInterval(timer);
            } else {
                refresh();
                start();
            }
        };

        // Premier appel hors du corps de l'effet (règle react-hooks/set-state-in-effect)
        const first = setTimeout(refresh, 0);
        start();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [refresh, intervalMs]);

    return { data, error, updatedAt, refresh };
}
