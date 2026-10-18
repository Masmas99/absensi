import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

const LEAVE_STATUS_STYLES = {
    leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const QUICK_REASONS = [
    { label: 'Cuti Tahunan', status: 'leave', text: 'Pengajuan Cuti Tahunan' },
    { label: 'Keperluan Keluarga', status: 'leave', text: 'Izin keperluan mendesak keluarga' },
    { label: 'Sakit / Istirahat Medis', status: 'sick', text: 'Sakit (istirahat medis sesuai anjuran dokter)' },
    { label: 'Urusan Administrasi', status: 'leave', text: 'Izin mengurus dokumen administrasi resmi' },
];

export default function Leave({
    todayDate,
    myTodayAttendance = null,
    leaveAttendances = [],
    leaveSummary = {},
}) {
    const { flash } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        date: todayDate || new Date().toISOString().slice(0, 10),
        status: 'leave',
        notes: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('attendance.leave.store'), {
            preserveScroll: true,
            onSuccess: () => reset('notes'),
        });
    };

    const applyQuickReason = (item) => {
        setData((prev) => ({
            ...prev,
            status: item.status,
            notes: item.text,
        }));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-bold leading-tight text-slate-900">
                        Menu Izin, Cuti & Sakit
                    </h2>
                    <p className="text-xs text-slate-500">
                        Formulir pengajuan izin, cuti tahunan, atau keterangan sakit karyawan
                    </p>
                </div>
            }
        >
            <Head title="Info Izin & Cuti" />

            <div className="mx-auto max-w-2xl space-y-4">
                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-2xs">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-2xs">
                        {flash.error}
                    </div>
                )}

                {/* Banner Header Menu Izin & Cuti */}
                <div className="rounded-2xl bg-gradient-to-r from-[#0052cc] to-[#0065ff] p-4 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                                Layanan Kepegawaian
                            </span>
                            <h3 className="mt-1 text-base font-extrabold">
                                Info & Pengajuan Izin / Cuti
                            </h3>
                            <p className="mt-0.5 text-xs text-blue-100">
                                Ajukan permohonan izin, cuti, atau sakit secara langsung
                            </p>
                        </div>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </div>
                    </div>

                    {/* 3-Column Summary Inside Card */}
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/10 p-2.5 text-center backdrop-blur-2xs">
                        <div>
                            <p className="text-[10px] font-medium text-blue-100">
                                Izin / Cuti
                            </p>
                            <p className="mt-0.5 text-lg font-extrabold">
                                {leaveSummary?.leave_month ?? 0}
                                <span className="ml-0.5 text-[10px] font-normal text-blue-100">
                                    hr
                                </span>
                            </p>
                        </div>
                        <div className="border-x border-white/15">
                            <p className="text-[10px] font-medium text-blue-100">
                                Sakit Bulan Ini
                            </p>
                            <p className="mt-0.5 text-lg font-extrabold">
                                {leaveSummary?.sick_month ?? 0}
                                <span className="ml-0.5 text-[10px] font-normal text-blue-100">
                                    hr
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-blue-100">
                                Sisa Kuota Cuti
                            </p>
                            <p className="mt-0.5 text-lg font-extrabold">
                                {leaveSummary?.remaining_quota ?? 12}
                                <span className="ml-0.5 text-[10px] font-normal text-blue-100">
                                    hr
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Pengajuan Izin / Cuti / Sakit */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4"
                >
                    <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-bold text-slate-900">
                            Formulir Pengajuan Baru
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Pilih kategori dan isi alasan ketidakhadiran Anda
                        </p>
                    </div>

                    {/* Pilih Jenis: Izin / Cuti vs Sakit */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">
                            Jenis Pengajuan
                        </label>
                        <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setData('status', 'leave')}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                                    data.status === 'leave'
                                        ? 'border-[#0065ff] bg-blue-50/80 text-[#0065ff] ring-2 ring-[#0065ff]/20'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                                Izin / Cuti
                            </button>

                            <button
                                type="button"
                                onClick={() => setData('status', 'sick')}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                                    data.status === 'sick'
                                        ? 'border-rose-500 bg-rose-50/80 text-rose-700 ring-2 ring-rose-500/20'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                Sakit
                            </button>
                        </div>
                        {errors.status && (
                            <p className="mt-1 text-xs text-rose-600">{errors.status}</p>
                        )}
                    </div>

                    {/* Pilih Tanggal */}
                    <div>
                        <label
                            htmlFor="leave_date"
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Tanggal Izin / Cuti
                        </label>
                        <input
                            id="leave_date"
                            type="date"
                            value={data.date}
                            onChange={(e) => setData('date', e.target.value)}
                            className="mt-1.5 block w-full rounded-xl border-slate-300 text-xs font-medium text-slate-800 shadow-2xs focus:border-[#0065ff] focus:ring-[#0065ff]"
                            required
                        />
                        {errors.date && (
                            <p className="mt-1 text-xs text-rose-600">{errors.date}</p>
                        )}
                    </div>

                    {/* Template Alasan Cepat */}
                    <div>
                        <span className="block text-[11px] font-semibold text-slate-500">
                            Pilih Cepat Alasan:
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {QUICK_REASONS.map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => applyQuickReason(item)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-[#0065ff]"
                                >
                                    + {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Keterangan / Alasan */}
                    <div>
                        <label
                            htmlFor="leave_notes"
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Keterangan / Alasan Lengkap
                        </label>
                        <textarea
                            id="leave_notes"
                            rows={3}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Tuliskan alasan pengajuan izin, cuti, atau sakit..."
                            className="mt-1.5 block w-full rounded-xl border-slate-300 text-xs text-slate-800 shadow-2xs focus:border-[#0065ff] focus:ring-[#0065ff]"
                            required
                        />
                        {errors.notes && (
                            <p className="mt-1 text-xs text-rose-600">{errors.notes}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 rounded-xl bg-[#0065ff] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50"
                        >
                            {processing
                                ? 'Menyimpan...'
                                : 'Simpan Pengajuan Izin / Cuti'}
                        </button>
                        <Link
                            href={route('dashboard')}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Kembali
                        </Link>
                    </div>
                </form>

                {/* Riwayat Pengajuan Izin & Cuti */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900">
                                Riwayat Izin, Cuti & Sakit Saya
                            </h4>
                            <p className="text-[11px] text-slate-500">
                                Daftar pengajuan yang telah tercatat di sistem
                            </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                            {leaveAttendances.length} Data
                        </span>
                    </div>

                    <div className="mt-3 space-y-2.5">
                        {leaveAttendances.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                                Belum ada riwayat pengajuan izin, cuti, atau sakit.
                            </div>
                        ) : (
                            leaveAttendances.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-slate-800">
                                            {item.date}
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                                LEAVE_STATUS_STYLES[item.status] ??
                                                LEAVE_STATUS_STYLES.leave
                                            }`}
                                        >
                                            {item.status_label}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-xs text-slate-600">
                                        {item.notes || '-'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
