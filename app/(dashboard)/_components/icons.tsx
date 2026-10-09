// SVG inline plutôt qu'une librairie d'icônes : quatre pictos ne justifient
// pas une dépendance de plus dans le bundle.
type IconProps = { className?: string };

const base = "h-5 w-5 shrink-0";

export function HomeIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
            <path d="M9.5 21v-6h5v6" />
        </svg>
    );
}

export function ContainerIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <rect x="3" y="4" width="18" height="6" rx="1.5" />
            <rect x="3" y="14" width="18" height="6" rx="1.5" />
            <path d="M7 7h.01M7 17h.01" />
        </svg>
    );
}

export function ChartIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <path d="M4 20V4" />
            <path d="M4 20h16" />
            <path d="M8 20v-6" />
            <path d="M13 20V9" />
            <path d="M18 20v-9.5" />
        </svg>
    );
}

export function DriveIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h4L10.5 9h9A1.5 1.5 0 0 1 21 10.5v7A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
        </svg>
    );
}

export function DatabaseIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <ellipse cx="12" cy="6" rx="7.5" ry="3" />
            <path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" />
            <path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" />
        </svg>
    );
}

export function ShieldIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <path d="M12 3l7.5 3v5.5c0 4.2-3 7.9-7.5 9.5-4.5-1.6-7.5-5.3-7.5-9.5V6Z" />
            <path d="m9 12 2.2 2.2L15.5 10" />
        </svg>
    );
}

export function PulseIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <path d="M3 12h3.5l2-5 3.5 10 2.5-5h6.5" />
        </svg>
    );
}

export function LogoutIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <path d="M14 4h3.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
            <path d="M10 8l-4 4 4 4" />
            <path d="M6 12h8" />
        </svg>
    );
}

export function GlobeIcon({ className }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className ?? base}
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M3.5 9.5h17M3.5 14.5h17" />
            <path d="M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
        </svg>
    );
}
