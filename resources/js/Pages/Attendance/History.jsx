import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const ATTENDANCE_STATUS_STYLES = {
    present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    not_yet: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const FILTER_TABS = [
    { key: 'all', label: 'Semua' },
    { key: 'present', label: 'Hadir' },
    { key: 'late', label: 'Terlambat' },
    { key: 'leave_sick', label: 'Izin / Sakit' },
];

export default function History({
    myTodayAttendance = null,
    attendances = [],
    monthlySummary = {},
}) {
    const user = usePage().props.auth?.user;
    const isEmployeeMobile = (user?.role || 'employee') === 'employee';
    const [activeFilter, setActiveFilter] = useState('all');

    const hasCheckedIn = Boolean(myTodayAttendance?.check_in);
    const hasCheckedOut = Boolean(myTodayAttendance?.check_out);

    const filteredAttendances = attendances.filter((item) => {
        if (activeFilter === 'all') {
            return true;
        }
        if (activeFilter === 'leave_sick') {
            return item.status === 'leave' || item.status === 'sick';
        }
        return item.status === activeFilter;
    });

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-bold leading-tight text-slate-900">
                        Riwayat Absensi Saya
                    </h2>
                    <p className="text-xs text-slate-500">
                        Rekapitulasi kehadiran dan catatan waktu Scan QR Check-In & Check-Out Anda
                    </p>
                </div>
            }
        >
            <Head title="Riwayat Absensi" />

            <div
                className={
                    isEmployeeMobile
                        ? 'mx-auto w-full space-y-4'
                        : 'mx-auto max-w-5xl space-y-5'
                }
            >
                {/* 1. Kartu Status Kehadiran Hari Ini */}
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0052cc] to-[#0065ff] p-4 text-white shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-semibold tracking-wider text-blue-100 uppercase">
                                Kehadiran Hari Ini
                            </p>
                            <h3 className="mt-0.5 text-base font-extrabold">
                                {hasCheckedIn
                                    ? myTodayAttendance.status_label
                                    : myTodayAttendance?.status === 'leave' ||
                                        myTodayAttendance?.status === 'sick'
                                      ? myTodayAttendance.status_label
                                      : 'Belum Check-In'}
                            </h3>
                        </div>

                        <Link
                            href={route('attendance.presensi')}
                            className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#0052cc] shadow-2xs transition hover:bg-blue-50"
                        >
                            {hasCheckedIn && !hasCheckedOut
                                ? 'Scan Pulang'
                                : hasCheckedOut
                                  ? 'Detail QR'
                                  : 'Scan Masuk'}
                        </Link>
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 divide-x divide-white/15 rounded-xl bg-white/10 p-3 backdrop-blur-2xs">
                        <div className="pr-3">
                            <span className="text-[11px] text-blue-100">
                                Jam Masuk (Check-In)
                            </span>
                            <p className="mt-0.5 font-mono text-sm font-bold text-white">
                                {myTodayAttendance?.check_in ?? '--:--:--'}
                            </p>
                        </div>
                        <div className="pl-3">
                            <span className="text-[11px] text-blue-100">
                                Jam Pulang (Check-Out)
                            </span>
                            <p className="mt-0.5 font-mono text-sm font-bold text-white">
                                {myTodayAttendance?.check_out ?? '--:--:--'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Ringkasan Statistik Bulan Ini (3 Kolom Simetris) */}
                <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200/60">
                            ✓
                        </span>
                        <p className="mt-2 text-xl font-extrabold text-slate-900">
                            {monthlySummary?.present ?? 0}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            Hadir Tepat
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-600 ring-1 ring-amber-200/60">
                            !
                        </span>
                        <p className="mt-2 text-xl font-extrabold text-slate-900">
                            {monthlySummary?.late ?? 0}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            Terlambat
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600 ring-1 ring-indigo-200/60">
                            i
                        </span>
                        <p className="mt-2 text-xl font-extrabold text-slate-900">
                            {monthlySummary?.leave ?? 0}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            Izin / Sakit
                        </p>
                    </div>
                </div>

                {/* 3. Filter Tab & Daftar Riwayat Kehadiran Terstruktur */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Daftar Riwayat Kehadiran
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Menampilkan {filteredAttendances.length} catatan presensi
                            </p>
                        </div>

                        <Link
                            href={route('attendance.leave')}
                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-[#0065ff] transition hover:bg-sky-100"
                        >
                            + Izin / Cuti
                        </Link>
                    </div>

                    {/* Filter Pills */}
                    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveFilter(tab.key)}
                                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                    activeFilter === tab.key
                                        ? 'bg-[#0065ff] text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* List Kartu Riwayat */}
                    <div className="mt-3.5 space-y-2.5">
                        {filteredAttendances.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
                                <p className="text-xs font-semibold text-slate-500">
                                    Belum ada data riwayat kehadiran pada kategori ini.
                                </p>
                            </div>
                        ) : (
                            filteredAttendances.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5 transition hover:border-slate-300 hover:bg-white"
                                >
                                    {/* Baris Atas: Tanggal & Badge Status */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0065ff]">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                                </svg>
                                            </span>
                                            <span className="font-mono text-xs font-bold text-slate-900">
                                                {item.date}
                                            </span>
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

                                    {/* Baris Tengah: Jam Masuk & Jam Pulang */}
                                    <div className="mt-2.5 grid grid-cols-2 divide-x divide-slate-200/70 rounded-xl bg-white p-2.5 ring-1 ring-slate-200/60">
                                        <div className="flex items-center gap-2 pr-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
                                                ↓
                                            </span>
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-400">
                                                    Jam Masuk
                                                </p>
                                                <p className="font-mono text-xs font-bold text-slate-800">
                                                    {item.check_in ?? '--:--:--'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pl-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-500">
                                                ↑
                                            </span>
                                            <div>
                                                <p className="text-[10px] font-medium text-slate-400">
                                                    Jam Pulang
                                                </p>
                                                <p className="font-mono text-xs font-bold text-slate-800">
                                                    {item.check_out ?? '--:--:--'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Baris Bawah: Keterangan */}
                                    {item.notes && (
                                        <p className="mt-2 text-[11px] text-slate-500">
                                            <span className="font-semibold text-slate-600">
                                                Ket:
                                            </span>{' '}
                                            {item.notes}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
