"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (!result || result.error) {
                setError("Identifiants incorrects.");
                return;
            }

            router.push("/");
            router.refresh();
        } catch {
            // `signIn` jette si la route /api/auth est injoignable : on
            // distingue ce cas d'un simple mauvais mot de passe.
            setError("Serveur d'authentification injoignable.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
            {/* Halos ambiants — mêmes codes que le hero du portfolio. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <div className="ambient-glow absolute -left-1/4 top-0 h-[70vw] w-[70vw] rounded-full bg-mauve/10 blur-[120px]" />
                <div
                    className="ambient-glow absolute -right-1/4 bottom-0 h-[60vw] w-[60vw] rounded-full bg-pink/[0.08] blur-[110px]"
                    style={{ animationDelay: "-9s" }}
                />
            </div>

            <div className="w-full max-w-sm animate-rise">
                <div className="mb-8 text-center">
                    <span
                        aria-hidden="true"
                        className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-glass font-serif text-xl font-bold text-gold backdrop-blur-xl"
                    >
                        T
                    </span>
                    <p className="eyebrow">Accès privé</p>
                    <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-text-main">
                        Infra<span className="text-gold">.</span>
                    </h1>
                    <p className="mt-2 font-mono text-[11px] text-text-muted">
                        tobias-ferrand.fr
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="glass-panel space-y-4 rounded-2xl p-6 sm:p-7"
                >
                    {/* aria-live : l'erreur est annoncée dès son apparition. */}
                    <div aria-live="polite" role="status">
                        {error && (
                            <p className="rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 text-xs font-medium text-text-main">
                                {error}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted"
                        >
                            E-mail
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-hairline bg-ink/50 px-3.5 py-2.5 text-sm text-text-main transition-colors placeholder:text-text-muted/50 hover:border-hairline-strong focus:border-mauve focus:outline-none disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted"
                        >
                            Mot de passe
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-hairline bg-ink/50 px-3.5 py-2.5 text-sm text-text-main transition-colors placeholder:text-text-muted/50 hover:border-hairline-strong focus:border-mauve focus:outline-none disabled:opacity-60"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full rounded-full bg-gold py-3 text-xs font-bold uppercase tracking-[0.2em] text-ink transition-all hover:scale-[1.02] hover:shadow-gold-glow disabled:scale-100 disabled:opacity-60 disabled:shadow-none"
                    >
                        {isSubmitting ? "Connexion…" : "Se connecter"}
                    </button>
                </form>
            </div>
        </div>
    );
}
