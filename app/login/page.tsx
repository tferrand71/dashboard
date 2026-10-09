"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Identifiants incorrects.");
        } else {
            router.push("/");
            router.refresh();
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-5 rounded-sm border border-line bg-surface p-8"
            >
                <div>
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm bg-accent-soft font-mono text-sm text-accent">
                        TF
                    </div>
                    <h1 className="text-lg font-medium text-text-primary">Connexion</h1>
                    <p className="mt-1 text-sm text-text-secondary">tobias-ferrand.fr</p>
                </div>

                {error && (
                    <p className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
                        {error}
                    </p>
                )}

                <div className="space-y-3">
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-sm bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                >
                    Se connecter
                </button>
            </form>
        </div>
    );
}
