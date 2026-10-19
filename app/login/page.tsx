"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Boxes, Cpu, HardDrive, Loader2, Lock } from "lucide-react";

const features = [
    { icon: Boxes, title: "Projets", text: "Déploiement depuis Git, HTTPS automatique via Traefik." },
    { icon: Cpu, title: "Système", text: "CPU, mémoire, disque et conteneurs Docker en direct." },
    { icon: HardDrive, title: "Drive", text: "Fichiers personnels stockés sur le VPS." },
];

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
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="flex flex-col px-6 py-8 sm:px-10">
                <div className="flex items-center gap-2.5">
                    <span
                        aria-hidden="true"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-hover text-[13px] font-bold text-white"
                    >
                        T
                    </span>
                    <span className="text-[13px] font-semibold text-fg">Infrastructure</span>
                </div>

                <div className="flex flex-1 items-center justify-center py-12">
                    <div className="animate-fade-in w-full max-w-sm">
                        <h1 className="text-2xl font-semibold tracking-tight text-fg">Connexion</h1>
                        <p className="mt-1.5 text-sm text-fg-muted">
                            Accès réservé à l&apos;administrateur de tobias-ferrand.fr.
                        </p>

                        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
                            {/* aria-live : l'erreur est annoncée dès son apparition. */}
                            <div aria-live="polite" role="status">
                                {error && (
                                    <p className="rounded-md border border-down/25 bg-down/10 px-3 py-2 text-[13px] text-down">
                                        {error}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email" className="label">
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="username"
                                    required
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting}
                                    className="input h-10"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="label">
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
                                    className="input h-10"
                                />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="btn btn-primary h-10 w-full text-sm">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Connexion…
                                    </>
                                ) : (
                                    "Se connecter"
                                )}
                            </button>
                        </form>

                        <p className="mt-6 flex items-center gap-2 text-xs text-fg-subtle">
                            <Lock className="h-3.5 w-3.5" />
                            Connexion chiffrée · session sécurisée par cookie httpOnly
                        </p>
                    </div>
                </div>

                <p className="font-mono text-[11px] text-fg-subtle">VPS OVH · Gravelines</p>
            </div>

            <aside className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-16">
                {/* Grille discrète en fond */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[110px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-pink/10 blur-[110px]"
                />

                <div className="relative max-w-md">
                    <p className="text-sm font-medium text-accent-fg">Console d&apos;administration</p>
                    <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-fg">
                        Toute l&apos;infrastructure auto-hébergée,{" "}
                        <span className="bg-gradient-to-r from-accent-fg to-pink bg-clip-text text-transparent">
                            au même endroit.
                        </span>
                    </h2>
                    <ul className="mt-10 space-y-5">
                        {features.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex gap-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/12 text-accent-fg ring-1 ring-accent/25">
                                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <span>
                                    <span className="block text-sm font-medium text-fg">{title}</span>
                                    <span className="block text-[13px] text-fg-muted">{text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}
