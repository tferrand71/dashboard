const modules = [
    {
        title: "Conteneurs Docker",
        description: "Suivre l'état des conteneurs et agir sans ouvrir un terminal.",
    },
    {
        title: "Analytics",
        description: "Statistiques de fréquentation des sites, sans Google Analytics.",
    },
    {
        title: "Drive personnel",
        description: "Stocker et partager des fichiers depuis le VPS.",
    },
];

export default function DashboardHome() {
    return (
        <div className="max-w-3xl">
            <header className="mb-10">
                <h1 className="text-2xl font-semibold text-text-primary">Bonjour, Tobias</h1>
                <p className="mt-2 text-sm text-text-secondary">
                    Vue d&apos;ensemble de ton infrastructure auto-hébergée.
                </p>
            </header>

            <section>
                <h2 className="mb-4 text-sm font-medium text-text-secondary">Modules</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {modules.map((module) => (
                        <div key={module.title} className="rounded-sm border border-line bg-surface p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-medium text-text-primary">{module.title}</h3>
                                <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                                    Bientôt
                                </span>
                            </div>
                            <p className="text-sm text-text-secondary">{module.description}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
