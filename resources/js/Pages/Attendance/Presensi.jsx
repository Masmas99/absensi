import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const ATTENDANCE_STATUS_STYLES = {
    present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    leave: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    sick: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    not_yet: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export default function Presensi({ myTodayAttendance = null, todayQrSession = null }) {
    const { flash, errors } = usePage().props;

    const [cameraActive, setCameraActive] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [cameraError, setCameraError] = useState('');
    const [scanningStatus, setScanningStatus] = useState('Arahkan kamera ke QR Code Superadmin...');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scanTimerRef = useRef(null);
    const lockSubmitRef = useRef(false);

    const hasCheckedIn = Boolean(myTodayAttendance?.check_in);
    const hasCheckedOut = Boolean(myTodayAttendance?.check_out);
    const isCompletedToday = hasCheckedIn && hasCheckedOut;
    const qrIsAvailable = Boolean(todayQrSession?.is_active);

    const stopCamera = () => {
        if (scanTimerRef.current) {
            clearInterval(scanTimerRef.current);
            scanTimerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const submitScannedQrToken = (scannedToken) => {
        if (lockSubmitRef.current || isCompletedToday) {
            return;
        }

        lockSubmitRef.current = true;
        setIsSubmitting(true);
        setScanningStatus(`QR Terbaca (${scannedToken}). Memproses absensi...`);
        stopCamera();

        const targetRoute = hasCheckedIn
            ? route('attendance.check-out')
            : route('attendance.check-in');

        router.post(
            targetRoute,
            { qr_token: scannedToken },
            {
                preserveScroll: true,
                onFinish: () => {
                    lockSubmitRef.current = false;
                    setIsSubmitting(false);
                },
            },
        );
    };

    const startCamera = async (preferredFacing = facingMode) => {
        setCameraError('');
        stopCamera();

        if (!navigator?.mediaDevices?.getUserMedia) {
            setCameraError(
                'Browser perangkat ini tidak mendukung akses kamera langsung (getUserMedia).',
            );
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: preferredFacing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            streamRef.current = stream;
            setCameraActive(true);
            setScanningStatus(
                hasCheckedIn
                    ? 'Kamera aktif — Arahkan ke QR Code Superadmin untuk Check-Out (Pulang)'
                    : 'Kamera aktif — Arahkan ke QR Code Superadmin untuk Check-In (Masuk)',
            );

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            if ('BarcodeDetector' in window) {
                const detector = new window.BarcodeDetector({
                    formats: ['qr_code'],
                });

                scanTimerRef.current = setInterval(async () => {
                    if (
                        !videoRef.current ||
                        !streamRef.current ||
                        lockSubmitRef.current
                    ) {
                        return;
                    }
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0 && barcodes[0].rawValue) {
                            submitScannedQrToken(barcodes[0].rawValue.trim());
                        }
                    } catch {
                        // Ignore transient frame errors while video initializes
                    }
                }, 350);
            } else {
                setScanningStatus(
                    'Kamera aktif — Arahkan ke QR Code Superadmin.',
                );
            }
        } catch {
            setCameraError(
                'Gagal membuka kamera. Pastikan izin akses kamera (Camera Permission) pada browser telah diizinkan.',
            );
        }
    };

    const handleSwitchCamera = () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        startCamera(nextMode);
    };

    useEffect(() => {
        if (!isCompletedToday && qrIsAvailable) {
            startCamera('environment');
        }
        return () => stopCamera();
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-bold leading-tight text-slate-900">
                        Presensi Scan QR Code
                    </h2>
                    <p className="text-xs text-slate-500">
                        Buka kamera dan arahkan ke QR Code yang ditampilkan oleh Superadmin
                    </p>
                </div>
            }
        >
            <Head title="Presensi Scan QR" />

            <div className="mx-auto max-w-2xl space-y-6">
                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {(flash?.error || errors?.qr_token) && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {flash?.error || errors?.qr_token}
                    </div>
                )}

                {/* Status Kehadiran Hari Ini */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Status Presensi Hari Ini
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900">
                                {isCompletedToday
                                    ? 'Presensi Hari Ini Selesai (Sudah Masuk & Pulang)'
                                    : hasCheckedIn
                                      ? 'Mode Scan: Check-Out (Absen Pulang)'
                                      : 'Mode Scan: Check-In (Absen Masuk)'}
                            </p>
                        </div>
                        <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
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

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs">
                        <div>
                            <span className="text-slate-400">Jam Masuk (Check-In)</span>
                            <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                                {myTodayAttendance?.check_in ?? '--:--:--'}
                            </p>
                        </div>
                        <div>
                            <span className="text-slate-400">Jam Pulang (Check-Out)</span>
                            <p className="mt-0.5 font-mono text-base font-bold text-slate-900">
                                {myTodayAttendance?.check_out ?? '--:--:--'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Camera Scanner Box */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    cameraActive
                                        ? 'animate-ping bg-emerald-400'
                                        : 'bg-slate-500'
                                }`}
                            />
                            <span className="text-sm font-bold">
                                Kamera Pemindai QR Code
                            </span>
                        </div>

                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                qrIsAvailable
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                            }`}
                        >
                            {qrIsAvailable
                                ? 'QR Superadmin Aktif'
                                : 'QR Superadmin Nonaktif'}
                        </span>
                    </div>

                    <div className="relative flex aspect-square max-h-[420px] w-full items-center justify-center bg-slate-900">
                        {cameraActive ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="h-full w-full object-cover"
                                />
                                {/* Viewfinder Frame Overlay */}
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="relative h-64 w-64 rounded-3xl border-2 border-indigo-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]">
                                        <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-emerald-400 shadow-sm shadow-emerald-300" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center px-6 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-indigo-300">
                                    <svg
                                        className="h-8 w-8"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.75"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                                        />
                                    </svg>
                                </div>
                                <p className="mt-4 text-sm font-semibold text-white">
                                    {isCompletedToday
                                        ? 'Anda sudah menyelesaikan Check-In & Check-Out hari ini.'
                                        : 'Kamera belum aktif'}
                                </p>
                                <p className="mt-1 max-w-sm text-xs text-slate-400">
                                    {isCompletedToday
                                        ? 'Terima kasih, kehadiran Anda hari ini telah tercatat lengkap.'
                                        : 'Klik tombol "Buka Kamera Scan QR" di bawah, lalu arahkan ke QR Code pada layar Superadmin.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 px-6 py-5">
                        {cameraError ? (
                            <p className="rounded-xl bg-rose-500/20 px-4 py-2.5 text-center text-xs font-medium text-rose-200">
                                {cameraError}
                            </p>
                        ) : (
                            <p className="text-center text-xs font-medium text-slate-300">
                                {isSubmitting
                                    ? 'Sedang memverifikasi QR Code...'
                                    : scanningStatus}
                            </p>
                        )}

                        {!isCompletedToday && (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {!cameraActive ? (
                                    <button
                                        type="button"
                                        onClick={() => startCamera(facingMode)}
                                        disabled={isSubmitting || !qrIsAvailable}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <svg
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                                            />
                                        </svg>
                                        Buka Kamera Scan QR
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleSwitchCamera}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
                                        >
                                            Ganti Kamera (Depan/Belakang)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
                                        >
                                            Matikan Kamera
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
