import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const ROLE_BADGE_STYLES = {
    superadmin: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    siswa: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
    employee: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
};

const TOPBAR_BADGE_STYLES = {
    superadmin: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    siswa: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    employee: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

const NAVIGATION_SECTIONS = [
    {
        title: 'Menu Utama',
        roles: ['superadmin', 'siswa', 'employee'],
        items: [
            {
                name: 'Dashboard',
                routeName: 'dashboard',
                icon: (
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                ),
            },
            {
                name: 'Pengaturan Lokasi GPS Presensi',
                routeName: 'school.settings.edit',
                roles: ['superadmin'],
                hasGpsBadge: true,
                icon: (
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                ),
            },
        ],
    },
    {
        title: 'Presensi Scan QR & Lokasi GPS',
        roles: ['siswa', 'employee'],
        items: [
            {
                name: 'Presensi (Scan QR)',
                routeName: 'attendance.presensi',
                icon: (
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    </svg>
                ),
            },
            {
                name: 'Riwayat Absensi',
                routeName: 'attendance.history',
                icon: (
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                ),
            },
            {
                name: 'Info Izin & Sakit',
                routeName: 'attendance.leave',
                icon: (
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                ),
            },
        ],
    },
    {
        title: 'Pengaturan Akun',
        roles: ['superadmin', 'siswa', 'employee'],
        items: [
            {
                name: 'Profil Saya',
                routeName: 'profile.edit',
                icon: (
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                ),
            },
        ],
    },
];

function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

/**
 * Bottom Navigation Bar khusus Mobile App Karyawan (Employee)
 * (Home, Riwayat, Floating Scan QR Button, Akun, Keluar).
 */
export function EmployeeBottomNav() {
    const onDashboard = route().current('dashboard');
    const onPresensi = route().current('attendance.presensi');
    const onHistory = route().current('attendance.history');
    const onProfile = route().current('profile.edit');

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-slate-200 bg-white px-2 pt-2 pb-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
            <div className="grid grid-cols-5 items-end text-center">
                {/* 1. Home */}
                <Link
                    href={route('dashboard')}
                    className={`flex flex-col items-center justify-end gap-1 py-0.5 text-[11px] font-semibold transition ${
                        onDashboard
                            ? 'text-[#0065ff]'
                            : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span>Home</span>
                </Link>

                {/* 2. Riwayat */}
                <Link
                    href={route('attendance.history')}
                    className={`flex flex-col items-center justify-end gap-1 py-0.5 text-[11px] font-semibold transition ${
                        onHistory
                            ? 'text-[#0065ff]'
                            : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Riwayat</span>
                </Link>

                {/* 3. Center Floating QR Button */}
                <div className="flex flex-col items-center justify-end">
                    <Link
                        href={route('attendance.presensi')}
                        className={`-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-[#0065ff] text-white shadow-lg ring-4 ring-sky-100 transition hover:scale-105 hover:bg-blue-600 ${
                            onPresensi ? 'ring-sky-300' : ''
                        }`}
                        title="Buka Kamera Scan QR Presensi"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                        </svg>
                    </Link>
                    <span
                        className={`mt-1 text-[11px] font-semibold ${
                            onPresensi ? 'text-[#0065ff]' : 'text-slate-500'
                        }`}
                    >
                        Scan QR
                    </span>
                </div>

                {/* 4. Akun */}
                <Link
                    href={route('profile.edit')}
                    className={`flex flex-col items-center justify-end gap-1 py-0.5 text-[11px] font-semibold transition ${
                        onProfile
                            ? 'text-[#0065ff]'
                            : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span>Akun</span>
                </Link>

                {/* 5. Keluar */}
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="flex flex-col items-center justify-end gap-1 py-0.5 text-[11px] font-semibold text-slate-400 transition hover:text-rose-600"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span>Keluar</span>
                </Link>
            </div>
        </nav>
    );
}

export default function AuthenticatedLayout({ header, children }) {
    const { auth, schoolSetting } = usePage().props;
    const user = auth.user;
    const isGpsActive = schoolSetting?.enable_gps_validation ?? true;
    const roleKey = user?.role || 'siswa';
    const roleLabel = user?.role_label || 'Siswa';
    const isSiswaMobile = roleKey === 'siswa' || roleKey === 'employee';
    const onDashboard = route().current('dashboard');

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Mobile-Only Layout for Siswa
    if (isSiswaMobile) {
        return (
            <div className="min-h-screen bg-slate-200/80">
                <div className="relative mx-auto min-h-screen max-w-md bg-slate-100 pb-24 shadow-2xl">
                    {/* Sub-page Mobile Header when not on Dashboard home */}
                    {!onDashboard && (
                        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#0065ff] px-4 py-3.5 text-white shadow-sm">
                            <div className="flex items-center gap-3">
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-lg bg-white/15 p-1.5 text-white hover:bg-white/25"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                    </svg>
                                </Link>
                                <div>
                                    <h1 className="text-sm font-bold leading-tight">
                                        E-ABSENSI Mobile
                                    </h1>
                                    <p className="text-[11px] text-blue-100">
                                        {user?.name}
                                    </p>
                                </div>
                            </div>

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25"
                            >
                                Keluar
                            </Link>
                        </header>
                    )}

                    <main className={onDashboard ? '' : 'p-4'}>{children}</main>

                    <EmployeeBottomNav />
                </div>
            </div>
        );
    }

    const visibleSections = NAVIGATION_SECTIONS.filter((section) =>
        section.roles.includes(roleKey),
    );

    const renderSidebarContent = () => (
        <div className="flex h-full flex-col bg-slate-900 text-slate-100">
            {/* Brand Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6">
                <Link
                    href={route('dashboard')}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                        <ApplicationLogo className="h-5 w-5 fill-current text-white" />
                    </div>
                    <div>
                        <span className="block text-base font-bold tracking-tight text-white">
                            E-Absensi
                        </span>
                        <span className="block text-[11px] font-medium text-slate-400">
                            Sistem Kehadiran Kerja
                        </span>
                    </div>
                </Link>

                <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
                >
                    <span className="sr-only">Tutup menu</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Active User Role Card */}
            <div className="border-b border-slate-800/80 px-5 py-4">
                <div className="rounded-xl bg-slate-800/70 p-3.5 ring-1 ring-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600/90 text-sm font-bold text-white">
                            {getInitials(user?.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                                {user?.name}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-2.5">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                            Hak Akses
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                ROLE_BADGE_STYLES[roleKey] ?? ROLE_BADGE_STYLES.employee
                            }`}
                        >
                            {roleLabel}
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
                {visibleSections.map((section) => (
                    <div key={section.title}>
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {section.title}
                        </p>
                        <div className="mt-2 space-y-1">
                            {section.items
                                .filter((item) => !item.roles || item.roles.includes(roleKey))
                                .map((item) => {
                                    const isActive = item.routeName
                                        ? route().current(item.routeName)
                                        : false;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={route(item.routeName)}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                                isActive
                                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                            }`}
                                        >
                                            <span className="flex min-w-0 items-center gap-3">
                                                {item.icon}
                                                <span className="truncate">{item.name}</span>
                                            </span>
                                            {item.hasGpsBadge && (
                                                <span
                                                    className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                                                        isGpsActive
                                                            ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
                                                            : 'bg-amber-500/20 text-amber-300 ring-amber-500/30'
                                                    }`}
                                                >
                                                    {isGpsActive ? 'GPS Aktif' : 'GPS Nonaktif'}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Sidebar Footer (Logout) */}
            <div className="border-t border-slate-800 p-4">
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/20 transition hover:bg-rose-500/20 hover:text-rose-200"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span>Keluar (Log Out)</span>
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="relative flex w-full max-w-xs flex-1 flex-col">
                        {renderSidebarContent()}
                    </div>
                </div>
            )}

            {/* Desktop Fixed Left Sidebar */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
                {renderSidebarContent()}
            </aside>

            {/* Main Content Area */}
            <div className="flex min-h-screen flex-col lg:pl-72">
                {/* Top Header Bar */}
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-2xs backdrop-blur-xs sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="-m-2.5 p-2.5 text-slate-700 hover:text-slate-900 lg:hidden"
                        >
                            <span className="sr-only">Buka navigasi sidebar</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>

                        {header ? (
                            <div>{header}</div>
                        ) : (
                            <h1 className="text-lg font-semibold text-slate-900">
                                Sistem Absensi
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span
                            className={`hidden items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${
                                TOPBAR_BADGE_STYLES[roleKey] ?? TOPBAR_BADGE_STYLES.employee
                            }`}
                        >
                            {roleLabel}
                        </span>

                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none"
                                        >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                                {getInitials(user?.name)}
                                            </span>
                                            <span className="hidden md:inline">{user?.name}</span>
                                            <svg
                                                className="h-4 w-4 text-slate-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>
                                        Profil Saya
                                    </Dropdown.Link>
                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                    >
                                        Keluar (Log Out)
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                {/* Page Body */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
