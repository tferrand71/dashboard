import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Mêmes familles que le portfolio : Playfair en display, Inter en UI.
// JetBrains Mono s'ajoute pour les valeurs techniques (domaines, dates, IDs).
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const playfair = Playfair_Display({
    variable: "--font-playfair",
    subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
    variable: "--font-jetbrains",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Infrastructure · tobias-ferrand.fr",
        template: "%s · tobias-ferrand.fr",
    },
    description: "Tableau de bord de l'infrastructure auto-hébergée",
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    themeColor: "#13111c",
    colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="fr"
            className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} h-full`}
        >
            <body className="min-h-full bg-midnight font-sans antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
