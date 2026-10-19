import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Inter pour l'interface, JetBrains Mono pour les valeurs techniques
// (domaines, commits, images Docker).
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
    variable: "--font-jetbrains",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Infrastructure · tobias-ferrand.fr",
        template: "%s · Infrastructure",
    },
    description: "Console de l'infrastructure auto-hébergée",
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
            className={`${inter.variable} ${jetbrains.variable} h-full`}
        >
            <body className="min-h-full bg-canvas font-sans text-fg antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
