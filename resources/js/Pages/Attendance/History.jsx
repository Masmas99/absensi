import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

const ATTENDANCE_STATUS_STYLES = {
    present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    not_yet: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export default function History({
    myTodayAttendance = null,
    attendances = [],
    monthlySummary = {},
}) {
    const cards = [
        {
            title: 'Status Hari Ini',
            value: myTodayAttendance?.check_in ? 'Sudah Absen' : 'Belum Absen',
            subtitle: myTodayAttendance?.check_in
                ? `Masuk pukul ${myTodayAttendance.check_in}`
                : 'Belum melakukan Scan QR hari ini',
            color: 'bg-indigo-50 text-indigo-600',
        },
        {
            title: 'Hadir Tepat Waktu',
            value: monthlySummary?.present ?? 0,
            subtitle: 'Total hari hadir bulan ini',
            color: 'bg-emerald-50 text-emerald-600',
        },
        {
            title: 'Terlambat Bulan Ini',
            value: monthlySummary?.late ?? 0,
            subtitle: 'Check-In melewati 08:15 WIB',
            color: 'bg-amber-50 text-amber-600',
        },
        {
            title: 'Izin / Cuti / Sakit',
            value: monthlySummary?.leave ?? 0,
            subtitle: 'Total hari izin bulan ini',
            color: 'bg-sky-50 text-sky-600',
        },
    ];

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

            <div className="mx-auto max-w-7xl space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <div
                            key={card.title}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {card.title}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-slate-900">
                                {card.value}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {card.subtitle}
                            </p>
                        </div>
                    ))}
                </div>

                {/* History Table */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Daftar Riwayat Kehadiran
                            </h3>
                            <p className="text-xs text-slate-500">
                                Data log presensi hasil scan QR Code
                            </p>
                        </div>

                        <Link
                            href={route('attendance.presensi')}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
                        >
                            Buka Kamera Scan QR
                        </Link>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead>
                                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <th className="pb-3 pr-4">Tanggal</th>
                                    <th className="px-4 pb-3">Jam Masuk (Check-In)</th>
                                    <th className="px-4 pb-3">Jam Pulang (Check-Out)</th>
                                    <th className="px-4 pb-3">Status</th>
                                    <th className="pb-3 pl-4">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-sm text-slate-500"
                                        >
                                            Belum ada riwayat absensi tercatat.
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/80"
                                        >
                                            <td className="whitespace-nowrap py-3.5 pr-4 font-mono text-xs font-semibold text-slate-800">
                                                {item.date}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-700">
                                                {item.check_in ?? '--:--:--'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-700">
                                                {item.check_out ?? '--:--:--'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                                        ATTENDANCE_STATUS_STYLES[
                                                            item.status
                                                        ] ??
                                                        ATTENDANCE_STATUS_STYLES.present
                                                    }`}
                                                >
                                                    {item.status_label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600">
                                                {item.notes ?? '-'}
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
