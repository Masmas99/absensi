import { Link } from '@inertiajs/react';
import { useState } from 'react';

const ATTENDANCE_STATUS_STYLES = {
    present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    not_yet: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export default function EmployeeMobileHome({
    user,
    myTodayAttendance = null,
    myAttendanceHistory = [],
    myMonthlySummary = {},
    formattedTime = '08:00:00',
    flash = {},
}) {
    const [showLiveClock, setShowLiveClock] = useState(false);
    const [activeSheet, setActiveSheet] = useState(null);

    const hasCheckedIn = Boolean(myTodayAttendance?.check_in);
    const hasCheckedOut = Boolean(myTodayAttendance?.check_out);

    const primaryDisplayValue = showLiveClock
        ? `${formattedTime}`
        : hasCheckedIn
          ? `${myTodayAttendance.check_in} WIB`
          : `${formattedTime}`;

    const primarySubtitle = showLiveClock
        ? 'Waktu Server Saat Ini'
        : hasCheckedIn
          ? `Sudah Check-In (${myTodayAttendance.status_label})`
          : 'Belum Check-In Hari Ini';

    const quickMenus = [
        {
            key: 'check_in',
            label: 'Absen Masuk',
            href: route('attendance.presensi'),
            iconBg: 'from-sky-100 to-blue-50 text-[#0065ff] ring-sky-200/80',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.9" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
            ),
        },
        {
            key: 'check_out',
            label: 'Absen Pulang',
            href: route('attendance.presensi'),
            iconBg: 'from-amber-100/80 to-orange-50 text-amber-600 ring-amber-200/80',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.9" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
            ),
        },
        {
            key: 'history',
            label: 'Riwayat Absen',
            href: route('attendance.history'),
            iconBg: 'from-emerald-100/80 to-teal-50 text-emerald-600 ring-emerald-200/80',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.9" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            key: 'shift',
            label: 'Jadwal Shift',
            onClick: () => setActiveSheet('shift'),
            iconBg: 'from-indigo-100/80 to-blue-50 text-indigo-600 ring-indigo-200/80',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.9" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            ),
        },
        {
            key: 'izin',
            label: 'Info Izin/Cuti',
            href: route('attendance.leave'),
            iconBg: 'from-sky-100 to-cyan-50 text-sky-600 ring-sky-200/80',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.9" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            ),
        },
        {
            key: 'other',
            label: 'Lainnya',
            href: route('profile.edit'),
            iconBg: 'from-slate-100 to-slate-50 text-blue-700 ring-slate-200',
            icon: (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="6" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="18" cy="12" r="2" />
                </svg>
            ),
        },
    ];

    return (
        <div className="mx-auto w-full max-w-md overflow-hidden bg-slate-100 pb-6">
            {/* Top Curved Royal Blue Header */}
            <div className="relative rounded-b-[2.25rem] bg-gradient-to-b from-[#0052cc] via-[#0065ff] to-[#0077ff] px-5 pt-5 pb-20 text-white shadow-md">
                {/* 3-Column Symmetrical Top Bar */}
                <div className="grid grid-cols-3 items-center">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-lime-400" />
                        <span className="truncate text-xs font-semibold text-blue-50">
                            {user?.name}
                        </span>
                    </div>

                    <div className="text-center">
                        <h1 className="text-lg leading-none font-black tracking-wider uppercase">
                            E-ABSENSI
                        </h1>
                        <span className="mt-0.5 block text-[11px] font-bold tracking-widest text-blue-100">
                            Mobile
                        </span>
                    </div>

                    <div className="flex justify-end">
                        <Link
                            href={route('attendance.presensi')}
                            className="relative rounded-full p-1.5 text-white transition hover:bg-white/10"
                            title="Presensi Scan QR"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                            {!hasCheckedIn && (
                                <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                                    1
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Center Primary Attendance Status */}
                <div className="mt-6 text-center">
                    <p className="text-xs font-medium text-blue-100">
                        {primarySubtitle}
                    </p>
                    <div className="mt-1.5 flex items-center justify-center gap-2">
                        <span className="text-xs font-semibold text-blue-100">
                            {hasCheckedIn && !showLiveClock ? 'Masuk' : 'Pukul'}
                        </span>
                        <span className="font-mono text-2xl font-extrabold tracking-tight">
                            {primaryDisplayValue}
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowLiveClock(!showLiveClock)}
                            className="rounded-full p-1 text-blue-100 transition hover:bg-white/10 hover:text-white"
                            title="Ganti tampilan Jam Masuk / Jam Sekarang"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-4">
                        <Link
                            href={route('attendance.presensi')}
                            className="inline-block rounded-lg border border-white/80 bg-white/10 px-7 py-1.5 text-xs font-semibold text-white backdrop-blur-2xs transition hover:bg-white/20"
                        >
                            {hasCheckedIn && !hasCheckedOut
                                ? 'Scan QR Check-Out'
                                : hasCheckedOut
                                  ? 'Presensi Selesai'
                                  : 'Scan QR Check-In'}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Flash Messages */}
            <div className="px-4">
                {flash?.success && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-2xs">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800 shadow-2xs">
                        {flash.error}
                    </div>
                )}
            </div>

            {/* Overlapping White Feature Grid Card (Structured 3x2 Grid with h-14 w-14 Circles) */}
            <div className="relative z-10 mx-4 -mt-12 rounded-3xl bg-white px-5 py-6 shadow-md ring-1 ring-slate-200/70">
                <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                    {quickMenus.map((item) => {
                        const content = (
                            <>
                                <div
                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b shadow-xs ring-1 transition group-hover:scale-105 ${item.iconBg}`}
                                >
                                    {item.icon}
                                </div>
                                <span className="mt-2 text-center text-xs leading-tight font-semibold text-slate-700">
                                    {item.label}
                                </span>
                            </>
                        );

                        if (item.href) {
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className="group flex flex-col items-center justify-start"
                                >
                                    {content}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={item.onClick}
                                className="group flex flex-col items-center justify-start"
                            >
                                {content}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Catatan Kehadiran Section */}
            <div className="mt-5 px-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#0052cc]">
                        Catatan Kehadiran
                    </h2>
                    <Link
                        href={route('attendance.history')}
                        className="text-xs font-semibold text-sky-600 hover:underline"
                    >
                        Lihat Detail
                    </Link>
                </div>

                <div className="mt-2.5 overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80">
                    <div className="grid grid-cols-2 divide-x divide-slate-100 p-4">
                        <div className="flex items-center gap-3 pr-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-base font-bold text-emerald-600 ring-1 ring-emerald-200/60">
                                ↓
                            </span>
                            <div>
                                <p className="text-[11px] font-medium text-slate-400">
                                    Jam Masuk
                                </p>
                                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                                    {myTodayAttendance?.check_in ?? '--:--'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pl-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-base font-bold text-rose-500 ring-1 ring-rose-200/60">
                                ↑
                            </span>
                            <div>
                                <p className="text-[11px] font-medium text-slate-400">
                                    Jam Pulang
                                </p>
                                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                                    {myTodayAttendance?.check_out ?? '--:--'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs">
                        <span className="font-medium text-slate-500">
                            Status Hari Ini
                        </span>
                        <span
                            className={`font-bold ${
                                hasCheckedIn ? 'text-emerald-600' : 'text-slate-700'
                            }`}
                        >
                            {hasCheckedIn
                                ? myTodayAttendance.status_label
                                : 'Belum Absen'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Riwayat Terakhir Section (fills bottom structure cleanly) */}
            <div className="mt-5 px-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#0052cc]">
                        Riwayat Presensi Terakhir
                    </h2>
                    <span className="text-[11px] font-medium text-slate-400">
                        Jam Kerja 08:00 - 17:00
                    </span>
                </div>

                <div className="mt-2.5 space-y-2">
                    {myAttendanceHistory.length === 0 ? (
                        <div className="rounded-2xl bg-white p-4 text-center text-xs text-slate-500 shadow-xs ring-1 ring-slate-200/80">
                            Belum ada riwayat presensi tercatat.
                        </div>
                    ) : (
                        myAttendanceHistory.slice(0, 3).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-xs ring-1 ring-slate-200/80"
                            >
                                <div>
                                    <p className="font-mono text-xs font-bold text-slate-800">
                                        {item.date}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        Masuk {item.check_in ?? '--:--'} • Pulang{' '}
                                        {item.check_out ?? '--:--'}
                                    </p>
                                </div>
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                        ATTENDANCE_STATUS_STYLES[item.status] ??
                                        ATTENDANCE_STATUS_STYLES.present
                                    }`}
                                >
                                    {item.status_label}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Interactive Info Modal / Bottom Sheet for Jadwal Shift */}
            {activeSheet === 'shift' && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
                    onClick={() => setActiveSheet(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-bold text-slate-900">
                            Jadwal Shift Kerja Reguler
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Ketentuan jam kerja operasional karyawan
                        </p>
                        <div className="mt-4 space-y-2 text-xs">
                            <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                                <span className="text-slate-500">Hari Kerja:</span>
                                <span className="font-bold text-slate-900">
                                    Senin – Jumat
                                </span>
                            </div>
                            <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                                <span className="text-slate-500">Jam Masuk:</span>
                                <span className="font-mono font-bold text-slate-900">
                                    08:00 WIB
                                </span>
                            </div>
                            <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                                <span className="text-slate-500">Toleransi Terlambat:</span>
                                <span className="font-mono font-bold text-amber-700">
                                    08:15 WIB
                                </span>
                            </div>
                            <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                                <span className="text-slate-500">Jam Pulang:</span>
                                <span className="font-mono font-bold text-slate-900">
                                    17:00 WIB
                                </span>
                            </div>
                        </div>

                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={() => setActiveSheet(null)}
                                className="w-full rounded-xl bg-[#0065ff] py-2.5 text-center text-xs font-bold text-white transition hover:bg-blue-600"
                            >
                                Tutup Jadwal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
