import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const ROLE_DESCRIPTIONS = {
    superadmin:
        'Akses penuh ke seluruh konfigurasi sistem, manajemen role & pengguna, penyedia QR Code presensi harian kantor, serta audit seluruh data absensi (Superadmin tidak perlu melakukan absensi).',
    hr_admin:
        'Mengelola operasional SDM harian, memantau rekapitulasi kehadiran seluruh karyawan, memverifikasi cuti/izin, dan mengelola jadwal kerja.',
    manager:
        'Memantau kehadiran anggota divisi/tim secara real-time, mengevaluasi ketepatan waktu tim, dan menyetujui pengajuan izin atau lembur.',
    employee:
        'Melakukan presensi masuk (Check-In) dan pulang (Check-Out) harian dengan memindai (scan) QR Code dari Superadmin, serta memantau riwayat kehadiran pribadi.',
};

const ROLE_PILL_STYLES = {
    superadmin: 'bg-purple-100 text-purple-800 ring-purple-600/20',
    hr_admin: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    manager: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    employee: 'bg-sky-100 text-sky-800 ring-sky-600/20',
};

const ATTENDANCE_STATUS_STYLES = {
    present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    not_yet: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const ROLE_TABS = [
    { slug: 'superadmin', label: 'Dashboard Superadmin' },
    { slug: 'hr_admin', label: 'Dashboard HR Admin' },
    { slug: 'manager', label: 'Dashboard Manager' },
    { slug: 'employee', label: 'Dashboard Karyawan' },
];

/**
 * Generates a deterministic 21x21 QR-style matrix from a token string
 * so the QR code renders offline in SVG without external network dependencies.
 */
function buildQrMatrix(value = 'ABSENSI-QR') {
    const size = 21;
    const matrix = Array.from({ length: size }, () => Array(size).fill(false));
    const reserved = Array.from({ length: size }, () => Array(size).fill(false));

    const placeFinderPattern = (rowOffset, colOffset) => {
        for (let r = -1; r <= 7; r += 1) {
            for (let c = -1; c <= 7; c += 1) {
                const rr = rowOffset + r;
                const cc = colOffset + c;
                if (rr < 0 || rr >= size || cc < 0 || cc >= size) {
                    continue;
                }
                reserved[rr][cc] = true;
                if (
                    r >= 0 &&
                    r <= 6 &&
                    c >= 0 &&
                    c <= 6 &&
                    (r === 0 ||
                        r === 6 ||
                        c === 0 ||
                        c === 6 ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4))
                ) {
                    matrix[rr][cc] = true;
                }
            }
        }
    };

    placeFinderPattern(0, 0);
    placeFinderPattern(0, size - 7);
    placeFinderPattern(size - 7, 0);

    for (let i = 8; i < size - 8; i += 1) {
        reserved[6][i] = true;
        reserved[i][6] = true;
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
    }

    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    let seed = hash >>> 0;
    for (let r = 0; r < size; r += 1) {
        for (let c = 0; c < size; c += 1) {
            if (reserved[r][c]) {
                continue;
            }
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const charBit =
                value.charCodeAt((r * size + c) % value.length) &
                (1 << ((r + c) % 7));
            matrix[r][c] = ((seed >>> 16) & 1) === 1 ? !charBit : Boolean(charBit);
        }
    }

    return matrix;
}

function QrCodeSvg({ value, className = 'h-40 w-40' }) {
    const matrix = useMemo(() => buildQrMatrix(value || 'ABSENSI'), [value]);
    const size = matrix.length;

    return (
        <svg
            viewBox={`0 0 ${size + 4} ${size + 4}`}
            className={className}
            shapeRendering="crispEdges"
            role="img"
            aria-label={`QR Code ${value}`}
        >
            <rect width={size + 4} height={size + 4} fill="#ffffff" rx="1.5" />
            {matrix.map((row, rIdx) =>
                row.map((cell, cIdx) =>
                    cell ? (
                        <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx + 2}
                            y={rIdx + 2}
                            width={1}
                            height={1}
                            fill="#0f172a"
                        />
                    ) : null,
                ),
            )}
        </svg>
    );
}

function StatGrid({ cards }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                    <div>
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
                    <div className={`rounded-xl p-3 ${card.color}`}>
                        {card.icon}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Widget khusus Superadmin untuk mengelola dan menampilkan QR Code Absensi.
 * Superadmin tidak memiliki fitur absensi mandiri.
 */
function SuperadminQrWidget({ todayQrSession, formattedTime, formattedDate }) {
    const [copied, setCopied] = useState(false);
    const [showFullscreenModal, setShowFullscreenModal] = useState(false);
    const { data, setData, post, processing } = useForm({
        title: todayQrSession?.title ?? 'QR Presensi Kantor Pusat',
    });

    const isActive = Boolean(todayQrSession?.is_active);
    const token = todayQrSession?.token ?? '';

    const handleRegenerate = (e) => {
        e.preventDefault();
        post(route('attendance.qr.generate'), { preserveScroll: true });
    };

    const handleToggleStatus = () => {
        router.patch(
            route('attendance.qr.toggle'),
            {},
            { preserveScroll: true },
        );
    };

    const handleCopyToken = async () => {
        if (!token || !navigator?.clipboard) {
            return;
        }
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <div className="flex flex-col justify-between rounded-2xl border border-purple-200 bg-white p-6 shadow-xs">
                <div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                            Generator QR Absensi
                        </span>
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                isActive
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                    : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                            />
                            {isActive ? 'QR Aktif' : 'QR Nonaktif'}
                        </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500">
                        {formattedDate} • <span className="font-mono font-semibold text-slate-700">{formattedTime}</span>
                    </p>

                    <div className="mt-3 flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                        <div
                            className={`rounded-xl border border-slate-200 bg-white p-2 shadow-2xs transition ${
                                !isActive ? 'opacity-40 grayscale' : ''
                            }`}
                        >
                            <QrCodeSvg value={token} className="h-32 w-32" />
                        </div>

                        <div className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
                            <code className="truncate font-mono text-xs font-bold text-slate-900">
                                {token || 'BELUM ADA TOKEN'}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopyToken}
                                className="shrink-0 rounded-md bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                            >
                                {copied ? 'Tersalin!' : 'Salin'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Judul Sesi Lokasi QR
                        </label>
                        <input
                            type="text"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1 block w-full rounded-xl border-slate-200 py-1.5 text-xs shadow-2xs focus:border-purple-500 focus:ring-purple-500"
                            placeholder="QR Presensi Kantor Pusat"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={processing}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-500 disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Buat QR Baru
                        </button>

                        <button
                            type="button"
                            onClick={handleToggleStatus}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                isActive
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                            {isActive ? 'Nonaktifkan QR' : 'Aktifkan QR'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowFullscreenModal(true)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                        Tampilkan Layar Penuh (Kiosk Scan)
                    </button>
                </div>
            </div>

            {showFullscreenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                            {todayQrSession?.title ?? 'QR Presensi Kantor Pusat'}
                        </span>
                        <h3 className="mt-3 text-xl font-bold text-slate-900">
                            Scan QR Code Untuk Absensi
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Arahkan kamera aplikasi absensi karyawan ke QR Code di bawah ini
                        </p>

                        <div className="my-6 flex justify-center">
                            <div className="rounded-3xl border-2 border-indigo-100 bg-white p-4 shadow-md">
                                <QrCodeSvg value={token} className="h-64 w-64" />
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-100 px-4 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Token QR Hari Ini ({todayQrSession?.date})
                            </p>
                            <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                                {token}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowFullscreenModal(false)}
                            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Tutup Layar Kiosk
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/**
 * Widget Presensi Scan QR Code untuk Karyawan, Manager, dan HR Admin.
 */
function QrScannerAttendanceWidget({
    myTodayAttendance,
    todayQrSession,
    formattedTime,
    formattedDate,
    onOpenFullScanner,
}) {
    const activeToken = todayQrSession?.is_active ? (todayQrSession?.token ?? '') : '';

    const { data, setData, post, processing, errors } = useForm({
        qr_token: activeToken,
        notes: 'WFO - Kantor Pusat',
    });

    const [isScanningSim, setIsScanningSim] = useState(false);
    const [scanSuccessMsg, setScanSuccessMsg] = useState('');
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const hasCheckedIn = Boolean(myTodayAttendance?.check_in);
    const hasCheckedOut = Boolean(myTodayAttendance?.check_out);
    const qrIsAvailable = Boolean(todayQrSession?.is_active);

    useEffect(() => {
        if (activeToken && !data.qr_token) {
            setData('qr_token', activeToken);
        }
    }, [activeToken]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const handleSimulateScan = () => {
        if (!qrIsAvailable || !todayQrSession?.token) {
            setCameraError('QR Code Superadmin sedang dinonaktifkan.');
            return;
        }
        setCameraError('');
        setIsScanningSim(true);
        setTimeout(() => {
            setData('qr_token', todayQrSession.token);
            setIsScanningSim(false);
            setScanSuccessMsg(`QR Terdeteksi: ${todayQrSession.token}`);
        }, 450);
    };

    const startCamera = async () => {
        setCameraError('');
        if (!navigator?.mediaDevices?.getUserMedia) {
            handleSimulateScan();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;
            setCameraActive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            if ('BarcodeDetector' in window) {
                const detector = new window.BarcodeDetector({
                    formats: ['qr_code'],
                });
                const scanInterval = setInterval(async () => {
                    if (!videoRef.current || !streamRef.current) {
                        clearInterval(scanInterval);
                        return;
                    }
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0 && barcodes[0].rawValue) {
                            setData('qr_token', barcodes[0].rawValue);
                            setScanSuccessMsg(`QR Terdeteksi: ${barcodes[0].rawValue}`);
                            clearInterval(scanInterval);
                            stopCamera();
                        }
                    } catch {
                        // Ignore frame detection errors
                    }
                }, 500);
            }
        } catch {
            // If camera is unavailable on desktop/localhost, automatically scan active office QR
            handleSimulateScan();
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const handleCheckIn = (e) => {
        e.preventDefault();
        post(route('attendance.check-in'), { preserveScroll: true });
    };

    const handleCheckOut = (e) => {
        e.preventDefault();
        post(route('attendance.check-out'), { preserveScroll: true });
    };

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Presensi Scan QR Code
                    </span>
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            hasCheckedIn
                                ? ATTENDANCE_STATUS_STYLES[myTodayAttendance.status] ??
                                  ATTENDANCE_STATUS_STYLES.present
                                : ATTENDANCE_STATUS_STYLES.not_yet
                        }`}
                    >
                        {hasCheckedIn
                            ? myTodayAttendance.status_label
                            : 'Belum Check-In'}
                    </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <div>
                        <p className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                            {formattedTime}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                            {formattedDate}
                        </p>
                    </div>
                    <span
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            qrIsAvailable
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-rose-50 text-rose-700'
                        }`}
                    >
                        {qrIsAvailable ? 'QR Superadmin Aktif' : 'QR Sedang Ditutup'}
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                        <span className="block text-slate-400">Jam Masuk</span>
                        <span className="mt-0.5 block font-mono text-sm font-bold text-slate-800">
                            {myTodayAttendance?.check_in ?? '--:--:--'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-slate-400">Jam Pulang</span>
                        <span className="mt-0.5 block font-mono text-sm font-bold text-slate-800">
                            {myTodayAttendance?.check_out ?? '--:--:--'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                {!hasCheckedOut && (
                    <>
                        {cameraActive ? (
                            <div className="relative overflow-hidden rounded-xl bg-slate-900">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="h-36 w-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="absolute top-2 right-2 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white"
                                >
                                    Tutup Kamera
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={handleSimulateScan}
                                    disabled={isScanningSim || !qrIsAvailable}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                    </svg>
                                    {isScanningSim ? 'Memindai...' : 'Pindai QR Kantor'}
                                </button>
                                <button
                                    type="button"
                                    onClick={
                                        onOpenFullScanner
                                            ? onOpenFullScanner
                                            : startCamera
                                    }
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Buka Layar Scan
                                </button>
                            </div>
                        )}

                        {scanSuccessMsg && (
                            <p className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                ✓ {scanSuccessMsg}
                            </p>
                        )}

                        {cameraError && (
                            <p className="text-[11px] font-medium text-amber-700">
                                {cameraError}
                            </p>
                        )}

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Token QR Superadmin Terdeteksi
                            </label>
                            <input
                                type="text"
                                value={data.qr_token}
                                onChange={(e) =>
                                    setData('qr_token', e.target.value.toUpperCase())
                                }
                                placeholder="Contoh: ABSEN-20261017-KANTOR"
                                className="mt-1 block w-full rounded-xl border-slate-200 font-mono text-xs uppercase shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.qr_token && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errors.qr_token}
                                </p>
                            )}
                        </div>
                    </>
                )}

                {!hasCheckedIn && (
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Lokasi / Catatan Kerja
                        </label>
                        <input
                            type="text"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Contoh: WFO - Kantor Pusat"
                            className="mt-1 block w-full rounded-xl border-slate-200 text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={handleCheckIn}
                        disabled={processing || hasCheckedIn || !data.qr_token}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {hasCheckedIn ? 'Sudah Masuk' : 'Scan Check-In'}
                    </button>
                    <button
                        type="button"
                        onClick={handleCheckOut}
                        disabled={
                            processing ||
                            !hasCheckedIn ||
                            hasCheckedOut ||
                            !data.qr_token
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                        {hasCheckedOut ? 'Sudah Pulang' : 'Scan Check-Out'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Halaman / Panel Penuh Presensi QR Code ketika user membuka #presensi dari Sidebar.
 */
function DedicatedPresensiSection({
    isSuperadminUser,
    todayQrSession,
    myTodayAttendance,
    todayTeamAttendances,
    formattedTime,
    formattedDate,
    onClosePresensi,
}) {
    const activeToken = todayQrSession?.is_active ? (todayQrSession?.token ?? '') : '';
    const { data, setData, post, processing, errors } = useForm({
        qr_token: activeToken,
        notes: 'WFO - Kantor Pusat',
    });

    const [scanningAnimation, setScanningAnimation] = useState(false);
    const [scanFeedback, setScanFeedback] = useState(
        activeToken ? `QR Aktif Siap Dipindai (${activeToken})` : '',
    );

    useEffect(() => {
        if (activeToken) {
            setData('qr_token', activeToken);
            setScanFeedback(`QR Aktif Siap Dipindai (${activeToken})`);
        }
    }, [activeToken]);

    const hasCheckedIn = Boolean(myTodayAttendance?.check_in);
    const hasCheckedOut = Boolean(myTodayAttendance?.check_out);
    const qrIsAvailable = Boolean(todayQrSession?.is_active);

    const handleInstantScan = () => {
        if (!qrIsAvailable || !todayQrSession?.token) {
            return;
        }
        setScanningAnimation(true);
        setTimeout(() => {
            setData('qr_token', todayQrSession.token);
            setScanningAnimation(false);
            setScanFeedback(
                `Berhasil memindai QR Superadmin: ${todayQrSession.token}`,
            );
        }, 500);
    };

    const handleCheckIn = (e) => {
        e.preventDefault();
        post(route('attendance.check-in'), { preserveScroll: true });
    };

    const handleCheckOut = (e) => {
        e.preventDefault();
        post(route('attendance.check-out'), { preserveScroll: true });
    };

    if (isSuperadminUser) {
        return (
            <div
                id="presensi"
                className="rounded-3xl border-2 border-purple-200 bg-white p-6 shadow-sm sm:p-8"
            >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                            Mode Kiosk & Generator QR Superadmin
                        </span>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">
                            Kelola QR Code Presensi Kantor Hari Ini
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Superadmin tidak melakukan absensi mandiri. Tampilkan QR Code ini agar karyawan dapat melakukan Scan Check-In & Check-Out.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClosePresensi}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                        ← Kembali ke Ringkasan Dashboard
                    </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <SuperadminQrWidget
                        todayQrSession={todayQrSession}
                        formattedTime={formattedTime}
                        formattedDate={formattedDate}
                    />

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                        <h4 className="text-base font-bold text-slate-900">
                            Status Karyawan Scan QR Hari Ini
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                            Daftar karyawan yang sudah dan belum memindai QR Code hari ini
                        </p>
                        <div className="mt-4 space-y-2.5">
                            {todayTeamAttendances.map((emp) => (
                                <div
                                    key={emp.user_id}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs"
                                >
                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {emp.name}
                                        </p>
                                        <p className="text-slate-500">
                                            Masuk: {emp.check_in ?? '--:--'} • Pulang:{' '}
                                            {emp.check_out ?? '--:--'}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                            ATTENDANCE_STATUS_STYLES[emp.status] ??
                                            ATTENDANCE_STATUS_STYLES.not_yet
                                        }`}
                                    >
                                        {emp.status_label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            id="presensi"
            className="rounded-3xl border-2 border-indigo-200 bg-white p-6 shadow-sm sm:p-8"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                        Portal Presensi Mandiri (Scan QR Code)
                    </span>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        Scan QR Code Kehadiran Karyawan
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Pindai QR Code yang disediakan oleh Superadmin di bawah ini untuk mencatat kehadiran Masuk (Check-In) atau Pulang (Check-Out).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClosePresensi}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                    ← Kembali ke Ringkasan Dashboard
                </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left Column: Visual QR Scanner / Active Office QR Display */}
                <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200 bg-slate-900 p-6 text-center text-white">
                    <div className="w-full">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold uppercase tracking-wider text-indigo-300">
                                {todayQrSession?.title ?? 'Layar QR Kantor Pusat'}
                            </span>
                            <span
                                className={`rounded-full px-2.5 py-0.5 font-semibold ${
                                    qrIsAvailable
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                }`}
                            >
                                {qrIsAvailable ? 'QR Aktif' : 'QR Ditutup'}
                            </span>
                        </div>

                        <div className="relative my-6 inline-flex items-center justify-center rounded-3xl border-2 border-indigo-400/40 bg-white p-5 shadow-xl">
                            <QrCodeSvg
                                value={todayQrSession?.token || 'NONAKTIF'}
                                className={`h-52 w-52 transition ${
                                    !qrIsAvailable ? 'opacity-25 grayscale' : ''
                                }`}
                            />
                            {scanningAnimation && (
                                <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 animate-pulse rounded-full bg-emerald-500 shadow-lg shadow-emerald-400" />
                            )}
                        </div>

                        <p className="font-mono text-sm font-bold text-indigo-200">
                            {qrIsAvailable
                                ? todayQrSession?.token
                                : 'Sesi QR Belum Diaktifkan Superadmin'}
                        </p>
                    </div>

                    <div className="mt-5 w-full space-y-2">
                        <button
                            type="button"
                            onClick={handleInstantScan}
                            disabled={!qrIsAvailable || scanningAnimation}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                            </svg>
                            {scanningAnimation
                                ? 'Memindai QR Code...'
                                : 'Pindai (Scan) QR Code Superadmin Sekarang'}
                        </button>
                        {scanFeedback && (
                            <p className="text-xs font-medium text-emerald-300">
                                ✓ {scanFeedback}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column: Check-In / Check-Out Execution Form */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Waktu Server Real-Time
                                </p>
                                <p className="mt-1 font-mono text-3xl font-bold text-slate-900">
                                    {formattedTime}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formattedDate}
                                </p>
                            </div>
                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                                    hasCheckedIn
                                        ? ATTENDANCE_STATUS_STYLES[
                                              myTodayAttendance.status
                                          ] ?? ATTENDANCE_STATUS_STYLES.present
                                        : ATTENDANCE_STATUS_STYLES.not_yet
                                }`}
                            >
                                {hasCheckedIn
                                    ? myTodayAttendance.status_label
                                    : 'Belum Check-In'}
                            </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                                <span className="text-xs text-slate-400">
                                    Jam Masuk (Check-In)
                                </span>
                                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                                    {myTodayAttendance?.check_in ?? '--:--:--'}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400">
                                    Jam Pulang (Check-Out)
                                </span>
                                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                                    {myTodayAttendance?.check_out ?? '--:--:--'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Kode Token Hasil Scan QR
                                </label>
                                <input
                                    type="text"
                                    value={data.qr_token}
                                    onChange={(e) =>
                                        setData(
                                            'qr_token',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    placeholder="Klik tombol Pindai QR atau tempel token"
                                    className="mt-1.5 block w-full rounded-xl border-slate-300 bg-white font-mono text-sm font-bold uppercase shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {errors.qr_token && (
                                    <p className="mt-1 text-xs font-semibold text-rose-600">
                                        {errors.qr_token}
                                    </p>
                                )}
                            </div>

                            {!hasCheckedIn && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                                        Catatan / Lokasi Kehadiran
                                    </label>
                                    <input
                                        type="text"
                                        value={data.notes}
                                        onChange={(e) =>
                                            setData('notes', e.target.value)
                                        }
                                        placeholder="Contoh: WFO - Kantor Pusat"
                                        className="mt-1.5 block w-full rounded-xl border-slate-300 bg-white text-sm shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={handleCheckIn}
                            disabled={
                                processing || hasCheckedIn || !data.qr_token
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {hasCheckedIn
                                ? '✓ Sudah Check-In Hari Ini'
                                : 'Konfirmasi Scan Check-In'}
                        </button>

                        <button
                            type="button"
                            onClick={handleCheckOut}
                            disabled={
                                processing ||
                                !hasCheckedIn ||
                                hasCheckedOut ||
                                !data.qr_token
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                            {hasCheckedOut
                                ? '✓ Sudah Check-Out Hari Ini'
                                : 'Konfirmasi Scan Check-Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SuperadminView({ stats, roles, recentUsers, recentAttendances }) {
    const [updatingUserId, setUpdatingUserId] = useState(null);

    const handleRoleChange = (targetUserId, newRole) => {
        setUpdatingUserId(targetUserId);
        router.patch(
            route('users.update-role', targetUserId),
            { role: newRole },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingUserId(null),
            },
        );
    };

    const cards = [
        {
            title: 'Total Akun Sistem',
            value: stats.total_users ?? 0,
            subtitle: 'Seluruh pengguna aktif',
            color: 'bg-purple-50 text-purple-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
        },
        {
            title: 'Level Hak Akses (Role)',
            value: stats.total_roles ?? 4,
            subtitle: 'Superadmin, HR, Manager, Karyawan',
            color: 'bg-indigo-50 text-indigo-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
            ),
        },
        {
            title: 'Presensi Masuk Hari Ini',
            value: stats.present_today ?? 0,
            subtitle: `${stats.on_time_today ?? 0} tepat waktu • ${stats.late_today ?? 0} terlambat`,
            color: 'bg-emerald-50 text-emerald-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Total Karyawan (Employee)',
            value: stats.employee_count ?? 0,
            subtitle: `${stats.not_checked_in_today ?? 0} belum scan QR hari ini`,
            color: 'bg-sky-50 text-sky-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <StatGrid cards={cards} />

            <div
                id="role-akses"
                className="grid grid-cols-1 gap-6 scroll-mt-20 lg:grid-cols-3"
            >
                {/* Role Matrix Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Matriks Role & Akses
                            </h3>
                            <p className="text-xs text-slate-500">
                                Distribusi 4 role sistem absensi
                            </p>
                        </div>
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                            Superadmin Control
                        </span>
                    </div>

                    <div className="mt-5 space-y-3">
                        {roles.map((role) => (
                            <div
                                key={role.slug}
                                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                            ROLE_PILL_STYLES[role.slug] ??
                                            ROLE_PILL_STYLES.employee
                                        }`}
                                    >
                                        {role.name}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">
                                        {role.users_count} Akun
                                    </span>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                    {role.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User & Role Management Table */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Manajemen Pengguna & Penugasan Role
                            </h3>
                            <p className="text-xs text-slate-500">
                                Ubah hak akses role pengguna secara langsung pada database mashudi_absen
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead>
                                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <th className="pb-3 pr-4">Nama Pengguna</th>
                                    <th className="px-4 pb-3">Email</th>
                                    <th className="px-4 pb-3">Role Aktif</th>
                                    <th className="pb-3 pl-4 text-right">Ubah Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentUsers.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80">
                                        <td className="whitespace-nowrap py-3.5 pr-4 font-semibold text-slate-900">
                                            {item.name}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                                            {item.email}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                                    ROLE_PILL_STYLES[item.role] ??
                                                    ROLE_PILL_STYLES.employee
                                                }`}
                                            >
                                                {item.role_label}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap py-3.5 pl-4 text-right">
                                            <select
                                                value={item.role}
                                                disabled={updatingUserId === item.id}
                                                onChange={(e) =>
                                                    handleRoleChange(item.id, e.target.value)
                                                }
                                                className="rounded-lg border-slate-200 py-1 pr-8 pl-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                                            >
                                                {roles.map((r) => (
                                                    <option key={r.slug} value={r.slug}>
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Global Attendance Audit Log */}
            <div
                id="monitoring-tim"
                className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            Log Audit Presensi QR Code Terbaru
                        </h3>
                        <p className="text-xs text-slate-500">
                            Rekam jejak check-in & check-out seluruh karyawan melalui pemindaian QR Code
                        </p>
                    </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead>
                            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="pb-3 pr-4">Tanggal</th>
                                <th className="px-4 pb-3">Nama</th>
                                <th className="px-4 pb-3">Check-In</th>
                                <th className="px-4 pb-3">Check-Out</th>
                                <th className="px-4 pb-3">Status</th>
                                <th className="pb-3 pl-4">Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentAttendances.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/80">
                                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-slate-600">
                                        {log.date}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                                        {log.user?.name ?? '-'}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                                        {log.check_in ?? '--:--:--'}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                                        {log.check_out ?? '--:--:--'}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                                ATTENDANCE_STATUS_STYLES[log.status] ??
                                                ATTENDANCE_STATUS_STYLES.present
                                            }`}
                                        >
                                            {log.status_label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">
                                        {log.notes ?? '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function HrAdminView({ stats, todayTeamAttendances, recentAttendances }) {
    const cards = [
        {
            title: 'Total Karyawan Aktif',
            value: stats.employee_count ?? 0,
            subtitle: 'Wajib presensi QR harian',
            color: 'bg-emerald-50 text-emerald-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
            ),
        },
        {
            title: 'Hadir Tepat Waktu',
            value: stats.on_time_today ?? 0,
            subtitle: 'Scan QR ≤ 08:15 WIB hari ini',
            color: 'bg-sky-50 text-sky-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Terlambat Hari Ini',
            value: stats.late_today ?? 0,
            subtitle: 'Melewati batas toleransi 08:15',
            color: 'bg-amber-50 text-amber-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Belum Presensi / Izin',
            value: (stats.not_checked_in_today ?? 0) + (stats.leave_today ?? 0),
            subtitle: `${stats.not_checked_in_today ?? 0} belum absen • ${stats.leave_today ?? 0} izin/cuti`,
            color: 'bg-rose-50 text-rose-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <StatGrid cards={cards} />

            <div
                id="monitoring-tim"
                className="grid scroll-mt-20 grid-cols-1 gap-6 lg:grid-cols-3"
            >
                {/* Daily Employee Attendance Recap */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Rekapitulasi Kehadiran Karyawan Hari Ini
                            </h3>
                            <p className="text-xs text-slate-500">
                                Pantauan operasional HR untuk seluruh karyawan aktif
                            </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Panel HR Admin
                        </span>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead>
                                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <th className="pb-3 pr-4">Karyawan</th>
                                    <th className="px-4 pb-3">Jam Masuk</th>
                                    <th className="px-4 pb-3">Jam Pulang</th>
                                    <th className="px-4 pb-3">Status Hari Ini</th>
                                    <th className="pb-3 pl-4">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {todayTeamAttendances.map((emp) => (
                                    <tr key={emp.user_id} className="hover:bg-slate-50/80">
                                        <td className="whitespace-nowrap py-3.5 pr-4">
                                            <div className="font-semibold text-slate-900">
                                                {emp.name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {emp.email}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                                            {emp.check_in ?? '--:--:--'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-700">
                                            {emp.check_out ?? '--:--:--'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                                    ATTENDANCE_STATUS_STYLES[emp.status] ??
                                                    ATTENDANCE_STATUS_STYLES.not_yet
                                                }`}
                                            >
                                                {emp.status_label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-slate-500">
                                            {emp.notes}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* HR Policies & Shift Overview */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                        <h3 className="text-base font-bold text-slate-900">
                            Aturan Shift & Jam Kerja HR
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Parameter standar perhitungan kehadiran QR
                        </p>

                        <dl className="mt-4 space-y-3 text-xs">
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                                <dt className="font-medium text-slate-600">Jam Masuk Reguler</dt>
                                <dd className="font-mono font-bold text-slate-900">08:00 WIB</dd>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                                <dt className="font-medium text-slate-600">Toleransi Keterlambatan</dt>
                                <dd className="font-mono font-bold text-amber-700">08:15 WIB</dd>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                                <dt className="font-medium text-slate-600">Jam Pulang Reguler</dt>
                                <dd className="font-mono font-bold text-slate-900">17:00 WIB</dd>
                            </div>
                        </dl>
                    </div>

                    <div
                        id="riwayat"
                        className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                    >
                        <h3 className="text-base font-bold text-slate-900">
                            Riwayat Presensi Terakhir
                        </h3>
                        <div className="mt-4 space-y-3">
                            {recentAttendances.slice(0, 4).map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-xs"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {item.user?.name}
                                        </p>
                                        <p className="text-slate-500">
                                            {item.date} • Masuk {item.check_in}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                            ATTENDANCE_STATUS_STYLES[item.status] ??
                                            ATTENDANCE_STATUS_STYLES.present
                                        }`}
                                    >
                                        {item.status_label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ManagerView({ stats, todayTeamAttendances }) {
    const totalTeam = stats.employee_count || 1;
    const attendanceRate = Math.round(
        ((stats.present_today ?? 0) / totalTeam) * 100,
    );

    const cards = [
        {
            title: 'Total Anggota Tim',
            value: stats.employee_count ?? 0,
            subtitle: 'Karyawan di bawah supervisi',
            color: 'bg-amber-50 text-amber-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
        },
        {
            title: 'Tim Hadir Hari Ini',
            value: stats.present_today ?? 0,
            subtitle: `${attendanceRate}% tingkat kehadiran hari ini`,
            color: 'bg-emerald-50 text-emerald-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Anggota Terlambat',
            value: stats.late_today ?? 0,
            subtitle: 'Perlu evaluasi kedisiplinan',
            color: 'bg-rose-50 text-rose-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Belum Scan QR',
            value: stats.not_checked_in_today ?? 0,
            subtitle: 'Menunggu konfirmasi kehadiran',
            color: 'bg-slate-100 text-slate-700',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <StatGrid cards={cards} />

            <div
                id="monitoring-tim"
                className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            Monitoring Kehadiran Anggota Tim Hari Ini
                        </h3>
                        <p className="text-xs text-slate-500">
                            Status check-in & check-out anggota divisi secara real-time
                        </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Supervisor / Manager View
                    </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {todayTeamAttendances.map((member) => (
                        <div
                            key={member.user_id}
                            className="flex flex-col justify-between rounded-xl border border-slate-200 p-4"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {member.email}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                            ATTENDANCE_STATUS_STYLES[member.status] ??
                                            ATTENDANCE_STATUS_STYLES.not_yet
                                        }`}
                                    >
                                        {member.status_label}
                                    </span>
                                </div>

                                <p className="mt-3 text-xs text-slate-600">
                                    Catatan: <span className="font-medium">{member.notes}</span>
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                                <div>
                                    <span className="text-slate-400">Check-In: </span>
                                    <span className="font-mono font-semibold text-slate-800">
                                        {member.check_in ?? '--:--'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Check-Out: </span>
                                    <span className="font-mono font-semibold text-slate-800">
                                        {member.check_out ?? '--:--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function EmployeeView({ myTodayAttendance, myAttendanceHistory, myMonthlySummary }) {
    const cards = [
        {
            title: 'Status Hari Ini',
            value: myTodayAttendance?.check_in ? 'Sudah Absen' : 'Belum Absen',
            subtitle: myTodayAttendance?.check_in
                ? `Masuk pukul ${myTodayAttendance.check_in}`
                : 'Silakan scan QR Code Superadmin',
            color: 'bg-indigo-50 text-indigo-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Hadir Tepat Waktu',
            value: myMonthlySummary?.present ?? 0,
            subtitle: 'Akumulasi bulan ini',
            color: 'bg-emerald-50 text-emerald-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            title: 'Terlambat Bulan Ini',
            value: myMonthlySummary?.late ?? 0,
            subtitle: 'Check-In melewati 08:15 WIB',
            color: 'bg-amber-50 text-amber-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            ),
        },
        {
            title: 'Izin / Cuti / Sakit',
            value: myMonthlySummary?.leave ?? 0,
            subtitle: 'Hari tidak hadir bulan ini',
            color: 'bg-sky-50 text-sky-600',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <StatGrid cards={cards} />

            <div
                id="riwayat"
                className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            Riwayat Kehadiran Saya (7 Hari Terakhir)
                        </h3>
                        <p className="text-xs text-slate-500">
                            Catatan waktu Check-In dan Check-Out pribadi Anda melalui QR Code
                        </p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        Portal Karyawan
                    </span>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead>
                            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="pb-3 pr-4">Tanggal</th>
                                <th className="px-4 pb-3">Jam Masuk (Check-In)</th>
                                <th className="px-4 pb-3">Jam Pulang (Check-Out)</th>
                                <th className="px-4 pb-3">Status</th>
                                <th className="pb-3 pl-4">Lokasi / Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {myAttendanceHistory.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 text-center text-sm text-slate-500"
                                    >
                                        Belum ada riwayat presensi. Silakan scan QR Code Superadmin untuk Check-In.
                                    </td>
                                </tr>
                            ) : (
                                myAttendanceHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80">
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
                                                    ATTENDANCE_STATUS_STYLES[item.status] ??
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
    );
}

export default function Dashboard({
    stats = {},
    roles = [],
    recentUsers = [],
    todayQrSession = null,
    myTodayAttendance = null,
    myAttendanceHistory = [],
    myMonthlySummary = {},
    todayTeamAttendances = [],
    recentAttendances = [],
}) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const actualRoleKey = user?.role || 'employee';
    const roleLabel = user?.role_label || 'Karyawan (Employee)';
    const isSuperadminUser = actualRoleKey === 'superadmin';

    // Superadmin can optionally preview how each role's dashboard looks
    const [previewRole, setPreviewRole] = useState(actualRoleKey);
    const activeRoleView = isSuperadminUser ? previewRole : actualRoleKey;

    const [activeHash, setActiveHash] = useState(() =>
        typeof window !== 'undefined' ? window.location.hash : '',
    );

    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const applyHashNavigation = (targetHash) => {
            setActiveHash(targetHash);
            if (targetHash && targetHash !== '#presensi') {
                const targetId = targetHash.replace('#', '');
                setTimeout(() => {
                    const el = document.getElementById(targetId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 80);
            } else if (targetHash === '#presensi') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        // Run on initial mount if URL already has #presensi or another hash
        if (window.location.hash) {
            applyHashNavigation(window.location.hash);
        }

        const onHashChange = () => applyHashNavigation(window.location.hash || '');
        const onCustomNavigate = (e) => applyHashNavigation(e.detail || '');

        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('absensi:navigate-hash', onCustomNavigate);
        return () => {
            window.removeEventListener('hashchange', onHashChange);
            window.removeEventListener('absensi:navigate-hash', onCustomNavigate);
        };
    }, []);

    const navigateToHash = (targetHash) => {
        const newUrl = targetHash
            ? `${window.location.pathname}${targetHash}`
            : window.location.pathname;
        window.history.pushState(null, '', newUrl);
        setActiveHash(targetHash);
        window.dispatchEvent(
            new CustomEvent('absensi:navigate-hash', { detail: targetHash }),
        );
    };

    const formattedTime = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const formattedDate = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-bold leading-tight text-slate-900">
                        {activeHash === '#presensi'
                            ? isSuperadminUser
                                ? 'Kelola QR Code Presensi'
                                : 'Presensi Scan QR Code'
                            : `Dashboard ${roleLabel}`}
                    </h2>
                    <p className="text-xs text-slate-500">
                        {activeHash === '#presensi'
                            ? 'Layanan absensi kehadiran berbasis QR Code Superadmin'
                            : 'Panel kendali & informasi kehadiran sesuai hak akses role Anda'}
                    </p>
                </div>
            }
        >
            <Head
                title={
                    activeHash === '#presensi'
                        ? `Presensi QR - ${roleLabel}`
                        : `Dashboard - ${roleLabel}`
                }
            />

            <div className="mx-auto max-w-7xl space-y-6">
                {/* Flash Notifications */}
                {flash?.success && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                        <span>{flash.error}</span>
                    </div>
                )}

                {activeHash === '#presensi' ? (
                    <DedicatedPresensiSection
                        isSuperadminUser={isSuperadminUser}
                        todayQrSession={todayQrSession}
                        myTodayAttendance={myTodayAttendance}
                        todayTeamAttendances={todayTeamAttendances}
                        formattedTime={formattedTime}
                        formattedDate={formattedDate}
                        onClosePresensi={() => navigateToHash('')}
                    />
                ) : (
                    <>
                        {/* Superadmin Role View Switcher */}
                        {isSuperadminUser && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-3.5">
                                <div className="text-xs text-indigo-900">
                                    <span className="font-bold">Mode Superadmin:</span>{' '}
                                    Anda dapat meninjau tampilan dashboard setiap role di bawah ini (Superadmin tidak memiliki absen mandiri, melainkan menyediakan QR Code):
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {ROLE_TABS.map((tab) => (
                                        <button
                                            key={tab.slug}
                                            type="button"
                                            onClick={() => setPreviewRole(tab.slug)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                activeRoleView === tab.slug
                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                    : 'bg-white text-slate-700 hover:bg-indigo-100'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Hero Banner + Right Side Panel (QR Generator for Superadmin, QR Scanner for Others) */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm lg:col-span-2">
                                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-white/15">
                                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                            <span>Role Aktif: {roleLabel}</span>
                                        </div>
                                        <h3 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                            Selamat datang, {user?.name}!
                                        </h3>
                                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                                            {ROLE_DESCRIPTIONS[activeRoleView] ??
                                                ROLE_DESCRIPTIONS.employee}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs text-slate-300">
                                        <button
                                            type="button"
                                            onClick={() => navigateToHash('#presensi')}
                                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3.5 py-2 font-semibold text-white shadow-xs transition hover:bg-indigo-400"
                                        >
                                            <span>
                                                {isSuperadminUser
                                                    ? 'Buka Kiosk QR Code'
                                                    : 'Buka Halaman Scan QR Presensi'}
                                            </span>
                                            <span>→</span>
                                        </button>
                                        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                                            <span className="font-semibold text-white">Jam Kerja:</span>
                                            <span>08:00 - 17:00 WIB (Toleransi 08:15)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isSuperadminUser ? (
                                <SuperadminQrWidget
                                    todayQrSession={todayQrSession}
                                    formattedTime={formattedTime}
                                    formattedDate={formattedDate}
                                />
                            ) : (
                                <QrScannerAttendanceWidget
                                    myTodayAttendance={myTodayAttendance}
                                    todayQrSession={todayQrSession}
                                    formattedTime={formattedTime}
                                    formattedDate={formattedDate}
                                    onOpenFullScanner={() =>
                                        navigateToHash('#presensi')
                                    }
                                />
                            )}
                        </div>
                    </>
                )}

                {/* Role-Specific Dashboard Content */}
                {activeRoleView === 'superadmin' && (
                    <SuperadminView
                        stats={stats}
                        roles={roles}
                        recentUsers={recentUsers}
                        recentAttendances={recentAttendances}
                    />
                )}

                {activeRoleView === 'hr_admin' && (
                    <HrAdminView
                        stats={stats}
                        todayTeamAttendances={todayTeamAttendances}
                        recentAttendances={recentAttendances}
                    />
                )}

                {activeRoleView === 'manager' && (
                    <ManagerView
                        stats={stats}
                        todayTeamAttendances={todayTeamAttendances}
                    />
                )}

                {activeRoleView === 'employee' && (
                    <EmployeeView
                        myTodayAttendance={myTodayAttendance}
                        myAttendanceHistory={myAttendanceHistory}
                        myMonthlySummary={myMonthlySummary}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
