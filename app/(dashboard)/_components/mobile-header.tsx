import { Brand } from "./brand";
import { SignOutButton } from "./sign-out-button";

/** Barre haute mobile : identité à gauche, session à droite. */
export function MobileHeader({ email }: { email: string }) {
    return (
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-hairline bg-glass-strong px-4 py-3 backdrop-blur-xl lg:hidden">
            <Brand />
            <div className="flex min-w-0 items-center gap-3">
                <p
                    className="min-w-0 truncate font-mono text-[10px] text-text-muted"
                    title={email}
                >
                    {email}
                </p>
                <SignOutButton variant="icon" />
            </div>
        </header>
    );
}
