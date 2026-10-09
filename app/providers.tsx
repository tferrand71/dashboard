"use client";

import { SessionProvider } from "next-auth/react";
import { Providers } from "./providers";
export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}