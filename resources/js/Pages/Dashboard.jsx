import EmployeeMobileHome from '@/Components/EmployeeMobileHome';
import QrCodeSvg from '@/Components/QrCodeSvg';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const STATUS_BADGES = {
    present: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    late: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    leave: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
    not_yet: 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20',
};

function FullscreenQrModal({ session, setting, onClose }) {
    const [clock, setClock] = useState(() =>
        new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
    );

    useEffect(() => {
        const timer = setInterval(() => {
            setClock(
                new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }),
            );
        }, 1000);

        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            clearInterval(timer);
            window.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 p-6 text-white sm:p-10">
            <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="h-3 w-3 animate-ping rounded-full bg-emerald-400" />
                    <div>
                        <h2 className="text-lg font-bold sm:text-xl">
                            {session?.title || 'Presensi QR Code Resmi'}
                        </h2>
                        <p className="text-xs text-slate-400">
                            Mode Layar Penuh Kiosk / Display TV
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="font-mono text-2xl font-black text-emerald-400 sm:text-3xl">
                        {clock} WIB
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                    >
                        Tutup (Esc)
                    </button>
                </div>
            </div>

            <div className="my-auto flex flex-col items-center text-center">
                <div className="rounded-3xl border-4 border-indigo-500/30 bg-white p-6 shadow-2xl sm:p-8">
                    {session?.token ? (
                        <QrCodeSvg value={session.token} size={320} />
                    ) : (
                        <div className="flex h-80 w-80 items-center justify-center text-slate-400">
                            Token QR Tidak Tersedia
                        </div>
                    )}
                </div>

                <div className="mt-6 space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300">
                        <span>Kode: {session?.token}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-300">
                        Scan menggunakan kamera pada menu Presensi akun masing-masing
                    </p>
                    {setting?.enable_gps_validation && (
                        <p className="text-xs text-amber-300">
                            📍 Validasi GPS Aktif: Presensi harus dilakukan dalam radius {setting.radius_meters} meter dari lokasi resmi
                        </p>
                    )}
                </div>
            </div>

            <div className="text-center text-xs text-slate-500">
                Tekan tombol Esc pada keyboard atau tombol Tutup di kanan atas untuk kembali ke Dashboard.
            </div>
        </div>
    );
}

export default function Dashboard({
    todayDate = '',
    todayQrSession = null,
    stats = {},
    myTodayAttendance = null,
    myAttendanceHistory = [],
    myMonthlySummary = {},
    todayTeamAttendances = [],
    schoolSetting = {},
}) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const isSuperadmin =
        user?.role === 'superadmin' || user?.role?.value === 'superadmin';

    const [fullscreenQr, setFullscreenQr] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [currentTime, setCurrentTime] = useState(() =>
        new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
    );

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(
                new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }),
            );
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleToggleQr = () => {
        router.patch(route('attendance.qr.toggle'), {}, { preserveScroll: true });
    };

    const handleGenerateQr = () => {
        router.post(
            route('attendance.qr.generate'),
            { title: 'Presensi QR Code Utama' },
            { preserveScroll: true },
        );
    };

    const filteredTeamAttendances = todayTeamAttendances.filter((item) => {
        const matchSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchSearch) return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'leave_sick') {
            return item.status === 'leave' || item.status === 'sick';
        }
        return item.status === statusFilter;
    });

    // If regular user (Siswa/Employee), render mobile/employee home
    if (!isSuperadmin) {
        return (
            <AuthenticatedLayout
                header={
                    <div>
                        <h2 className="text-lg font-bold leading-tight text-slate-900">
                            Dashboard Presensi
                        </h2>
                        <p className="text-xs text-slate-500">
                            Portal absensi QR Code & validasi lokasi GPS
                        </p>
                    </div>
                }
            >
                <Head title="Dashboard Presensi" />

                <EmployeeMobileHome
                    user={user}
                    myTodayAttendance={myTodayAttendance}
                    myAttendanceHistory={myAttendanceHistory}
                    myMonthlySummary={myMonthlySummary}
                    formattedTime={currentTime}
                    flash={flash}
                />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold leading-tight text-slate-900">
                            Dashboard Super Admin
                        </h2>
                        <p className="text-xs text-slate-500">
                            Penyedia sesi QR Code presensi dan validasi koordinat GPS
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-mono text-xs font-bold text-indigo-700">
                            <span className="h-2 w-2 animate-ping rounded-full bg-indigo-600" />
                            {currentTime} WIB
                        </span>
                    </div>
                </div>
            }
        >
            <Head title="Super Admin Dashboard" />

            {fullscreenQr && (
                <FullscreenQrModal
                    session={todayQrSession}
                    setting={schoolSetting}
                    onClose={() => setFullscreenQr(false)}
                />
            )}

            <div className="space-y-6">
                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-2xs">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 shadow-2xs">
                        {flash.error}
                    </div>
                )}

                {/* Top QR Hero Banner */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                        todayQrSession?.is_active
                                            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                                    }`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            todayQrSession?.is_active
                                                ? 'animate-pulse bg-emerald-400'
                                                : 'bg-rose-400'
                                        }`}
                                    />
                                    {todayQrSession?.is_active
                                        ? 'Sesi QR Aktif'
                                        : 'Sesi QR Dinonaktifkan'}
                                </span>

                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                                    {todayDate}
                                </span>

                                {schoolSetting?.enable_gps_validation && (
                                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">
                                        📍 GPS Wajib (Radius {schoolSetting.radius_meters}m)
                                    </span>
                                )}
                            </div>

                            <h1 className="text-xl font-black text-white sm:text-2xl">
                                {todayQrSession?.title || 'Presensi QR Code Utama'}
                            </h1>
                            <p className="max-w-xl text-xs leading-relaxed text-slate-300">
                                Tampilkan QR Code ini pada layar TV, tablet, atau printout di gerbang sekolah / kantor. Siswa atau karyawan wajib memindai QR ini dari lokasi yang sesuai dengan radius GPS yang telah dikonfigurasi.
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFullscreenQr(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                    </svg>
                                    Layar Penuh (Display Kiosk / TV)
                                </button>

                                <button
                                    type="button"
                                    onClick={handleToggleQr}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                                        todayQrSession?.is_active
                                            ? 'border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                                            : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                    }`}
                                >
                                    {todayQrSession?.is_active
                                        ? 'Pause / Nonaktifkan Sesi'
                                        : 'Aktifkan Sesi QR'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleGenerateQr}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
                                >
                                    Perbarui Token QR
                                </button>
                            </div>
                        </div>

                        {/* QR Code Preview Box */}
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                            <div className="rounded-xl bg-white p-3 shadow-lg">
                                {todayQrSession?.token ? (
                                    <QrCodeSvg value={todayQrSession.token} size={150} />
                                ) : (
                                    <div className="flex h-36 w-36 items-center justify-center text-xs text-slate-400">
                                        Token Kosong
                                    </div>
                                )}
                            </div>
                            <span className="mt-2.5 font-mono text-xs font-bold text-indigo-200">
                                {todayQrSession?.token || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Metric Stat Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                        <p className="text-xs font-medium text-slate-500">Total Siswa / User</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">
                            {stats.siswa_count ?? 0}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">Terdaftar di sistem</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                        <p className="text-xs font-medium text-slate-500">Hadir Tepat Waktu</p>
                        <p className="mt-2 text-2xl font-black text-emerald-600">
                            {stats.on_time_today ?? 0}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-600/80">Hari ini</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                        <p className="text-xs font-medium text-slate-500">Terlambat</p>
                        <p className="mt-2 text-2xl font-black text-amber-600">
                            {stats.late_today ?? 0}
                        </p>
                        <p className="mt-1 text-[11px] text-amber-600/80">Hari ini</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                        <p className="text-xs font-medium text-slate-500">Validasi GPS</p>
                        <p className="mt-2 text-base font-black text-indigo-700">
                            {schoolSetting?.enable_gps_validation ? 'Aktif' : 'Nonaktif'}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                            Radius {schoolSetting?.radius_meters ?? 100} meter
                        </p>
                    </div>
                </div>

                {/* Realtime Attendance Monitoring */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-base font-bold text-slate-900">
                                    Monitoring Kehadiran Siswa / Karyawan
                                </h3>
                                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                                    {todayTeamAttendances.length}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Status check-in realtime dan data koordinat GPS absensi hari ini ({todayDate})
                            </p>
                        </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Cari nama atau email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="rounded-xl border-slate-200 text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                                />

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="rounded-xl border-slate-200 text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="present">Hadir</option>
                                    <option value="late">Terlambat</option>
                                    <option value="leave_sick">Izin / Sakit</option>
                                    <option value="not_yet">Belum Absen</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700">
                                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Nama Pengguna</th>
                                        <th className="px-4 py-3">Check-In</th>
                                        <th className="px-4 py-3">Check-Out</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Jarak GPS</th>
                                        <th className="px-4 py-3">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTeamAttendances.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-8 text-center text-slate-400">
                                                Tidak ada data kehadiran yang sesuai dengan filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTeamAttendances.map((item) => (
                                            <tr key={item.user_id} className="hover:bg-slate-50/60">
                                                <td className="px-4 py-3.5">
                                                    <p className="font-bold text-slate-900">{item.name}</p>
                                                    <p className="text-[11px] text-slate-400">{item.email}</p>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono">
                                                    {item.check_in ? `${item.check_in} WIB` : '-'}
                                                </td>
                                                <td className="px-4 py-3.5 font-mono">
                                                    {item.check_out ? `${item.check_out} WIB` : '-'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span
                                                        className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                            STATUS_BADGES[item.status] ||
                                                            STATUS_BADGES.not_yet
                                                        }`}
                                                    >
                                                        {item.status_label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {item.distance_meters !== undefined &&
                                                    item.distance_meters !== null ? (
                                                        <span
                                                            className={`font-semibold ${
                                                                item.distance_meters <=
                                                                (schoolSetting?.radius_meters ?? 100)
                                                                    ? 'text-emerald-700'
                                                                    : 'text-amber-600'
                                                            }`}
                                                        >
                                                            {item.distance_meters} meter
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500">
                                                    {item.notes}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
