import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

export default function Presensi({
    myTodayAttendance = null,
    todayQrSession = null,
}) {
    const { flash, errors } = usePage().props;

    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [facingMode, setFacingMode] = useState('environment'); // 'environment' (belakang) | 'user' (depan)
    const [availableCameras, setAvailableCameras] = useState([]);
    const [activeDeviceId, setActiveDeviceId] = useState('');
    const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
    const [scanningStatus, setScanningStatus] = useState(
        'Arahkan kamera ke QR Code Superadmin...',
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qrDetectedLock, setQrDetectedLock] = useState(false);

    // Background GPS coordinates (dikirim ke backend saat scan QR)
    const [gpsCoords, setGpsCoords] = useState(null);
    const coordsRef = useRef(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanTimerRef = useRef(null);
    const lockSubmitRef = useRef(false);

    const hasCheckedIn = Boolean(myTodayAttendance?.check_in);
    const hasCheckedOut = Boolean(myTodayAttendance?.check_out);
    const isCompletedToday = hasCheckedIn && hasCheckedOut;
    const qrIsAvailable = Boolean(todayQrSession?.is_active);

    // Dapatkan posisi GPS secara background untuk payload ke backend
    useEffect(() => {
        if (!navigator?.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const current = {
                    latitude: parseFloat(pos.coords.latitude.toFixed(7)),
                    longitude: parseFloat(pos.coords.longitude.toFixed(7)),
                };
                setGpsCoords(current);
                coordsRef.current = current;
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
        );

        let watchId = null;
        if (navigator.geolocation.watchPosition) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const current = {
                        latitude: parseFloat(pos.coords.latitude.toFixed(7)),
                        longitude: parseFloat(pos.coords.longitude.toFixed(7)),
                    };
                    setGpsCoords(current);
                    coordsRef.current = current;
                },
                () => {},
                { enableHighAccuracy: true, maximumAge: 5000 },
            );
        }

        return () => {
            if (watchId !== null && navigator.geolocation.clearWatch) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, []);

    // Ambil daftar kamera yang tersedia di HP (terutama setelah izin kamera didapatkan)
    const getCameraDevices = async () => {
        if (!navigator?.mediaDevices?.enumerateDevices) return [];
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter((d) => d.kind === 'videoinput');
            setAvailableCameras(videoDevices);
            return videoDevices;
        } catch {
            return [];
        }
    };

    const stopCamera = () => {
        if (scanTimerRef.current) {
            clearInterval(scanTimerRef.current);
            scanTimerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setQrDetectedLock(false);
    };

    const submitScannedQrToken = (scannedToken) => {
        const cleanToken = (scannedToken || '').trim();
        if (lockSubmitRef.current || isCompletedToday || !cleanToken) {
            return;
        }

        const activeCoords = coordsRef.current || gpsCoords;

        lockSubmitRef.current = true;
        setQrDetectedLock(true);
        setIsSubmitting(true);
        setScanningStatus('QR Code terdeteksi! Memproses absensi...');
        stopCamera();

        const targetRoute = hasCheckedIn
            ? route('attendance.check-out')
            : route('attendance.check-in');

        const payload = {
            qr_token: cleanToken,
            latitude: activeCoords?.latitude ?? null,
            longitude: activeCoords?.longitude ?? null,
        };

        router.post(targetRoute, payload, {
            preserveScroll: true,
            onFinish: () => {
                lockSubmitRef.current = false;
                setIsSubmitting(false);
            },
        });
    };

    const startCamera = async (targetFacing = facingMode, targetDeviceId = activeDeviceId) => {
        setCameraError('');
        stopCamera();

        // Jeda singkat agar hardware kamera di smartphone melepaskan resource sebelumnya
        await new Promise((resolve) => setTimeout(resolve, 150));

        if (!navigator?.mediaDevices?.getUserMedia) {
            setCameraError(
                'Browser perangkat ini tidak mendukung akses kamera langsung.',
            );
            return;
        }

        // Susun daftar constraints dari yang paling spesifik ke umum agar kompatibel di semua HP
        const constraintsList = [];

        if (targetDeviceId) {
            constraintsList.push({
                video: {
                    deviceId: { exact: targetDeviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
        }

        constraintsList.push({
            video: {
                facingMode: { exact: targetFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
        });

        constraintsList.push({
            video: {
                facingMode: { ideal: targetFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
        });

        constraintsList.push({
            video: {
                facingMode: targetFacing,
            },
        });

        constraintsList.push({ video: true });

        let stream = null;
        let lastError = null;

        for (const constraint of constraintsList) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraint);
                if (stream) break;
            } catch (err) {
                lastError = err;
            }
        }

        if (!stream) {
            setCameraError(
                `Gagal membuka kamera: ${lastError?.message || 'Pastikan izin kamera pada browser HP telah diizinkan.'}`,
            );
            return;
        }

        streamRef.current = stream;
        setCameraActive(true);
        setScanningStatus(
            hasCheckedIn
                ? 'Kamera aktif — Arahkan ke QR Code Superadmin (Check-Out)'
                : 'Kamera aktif — Arahkan ke QR Code Superadmin (Check-In)',
        );

        // Ambil info track yang aktif di HP
        const videoTrack = stream.getVideoTracks()?.[0];
        if (videoTrack) {
            const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
            if (settings.deviceId) {
                setActiveDeviceId(settings.deviceId);
            }
            if (settings.facingMode) {
                setFacingMode(settings.facingMode);
            }
        }

        // Perbarui daftar kamera perangkat (di smartphone, label baru terbaca setelah stream aktif)
        await getCameraDevices();

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(() => {});
            };
            try {
                await videoRef.current.play();
            } catch {
                // Auto-play policy handled by onloadedmetadata
            }
        }

        const nativeDetector =
            'BarcodeDetector' in window
                ? new window.BarcodeDetector({ formats: ['qr_code'] })
                : null;

        scanTimerRef.current = setInterval(async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas || lockSubmitRef.current) {
                return;
            }

            if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
                return;
            }

            // 1. Coba deteksi via native BarcodeDetector jika didukung browser HP
            if (nativeDetector) {
                try {
                    const barcodes = await nativeDetector.detect(video);
                    if (barcodes.length > 0 && barcodes[0].rawValue) {
                        submitScannedQrToken(barcodes[0].rawValue.trim());
                        return;
                    }
                } catch {
                    // Fallback to jsQR
                }
            }

            // 2. Decode akurat menggunakan library jsQR
            try {
                const width = video.videoWidth;
                const height = video.videoHeight;
                const scale = width > 800 ? 0.6 : 1;
                const targetWidth = Math.round(width * scale);
                const targetHeight = Math.round(height * scale);

                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                }

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return;

                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

                const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'attemptBoth',
                });

                if (decoded && decoded.data && decoded.data.trim()) {
                    submitScannedQrToken(decoded.data.trim());
                }
            } catch {
                // Ignore transient decode errors
            }
        }, 250);
    };

    // Fungsi beralih kamera depan / belakang untuk HP
    const switchCameraFacing = async () => {
        if (isSwitchingCamera) return;
        setIsSwitchingCamera(true);

        const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextFacing);

        // Cari kamera target berdasarkan label perangkat di HP
        let targetDevice = null;
        if (availableCameras.length > 0) {
            const isFront = (d) => {
                const label = (d.label || '').toLowerCase();
                return (
                    label.includes('front') ||
                    label.includes('user') ||
                    label.includes('depan') ||
                    label.includes('selfie') ||
                    label.includes('facetime')
                );
            };
            const isBack = (d) => {
                const label = (d.label || '').toLowerCase();
                return (
                    label.includes('back') ||
                    label.includes('rear') ||
                    label.includes('environment') ||
                    label.includes('belakang') ||
                    label.includes('main')
                );
            };

            if (nextFacing === 'user') {
                targetDevice = availableCameras.find(isFront);
            } else {
                targetDevice = availableCameras.find(isBack);
            }

            // Jika label generik atau tidak terdeteksi, pilih kamera selain yang sedang aktif
            if (!targetDevice && availableCameras.length > 1) {
                targetDevice = availableCameras.find((d) => d.deviceId !== activeDeviceId) || availableCameras[0];
            }
        }

        const nextDeviceId = targetDevice?.deviceId || '';
        setActiveDeviceId(nextDeviceId);

        await startCamera(nextFacing, nextDeviceId);
        setIsSwitchingCamera(false);
    };



    useEffect(() => {
        if (!isCompletedToday && qrIsAvailable) {
            startCamera('environment');
        }
        return () => stopCamera();
    }, [myTodayAttendance?.check_in, myTodayAttendance?.check_out]);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-lg font-bold leading-tight text-slate-900">
                        Presensi Scan QR Code
                    </h2>
                    <p className="text-xs text-slate-500">
                        Pindai kode QR resmi untuk melakukan absensi kehadiran
                    </p>
                </div>
            }
        >
            <Head title="Presensi Scan QR" />

            <canvas ref={canvasRef} className="hidden" />

            <div className="mx-auto max-w-md space-y-4">
                {/* Alert Notifikasi Flash & Error (Hasil validasi dari Backend) */}
                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-2xs">
                        {flash.success}
                    </div>
                )}

                {(flash?.error || errors?.qr_token || errors?.location || cameraError) && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 shadow-2xs">
                        {flash?.error || errors?.qr_token || errors?.location || cameraError}
                    </div>
                )}

                {/* Camera Scanner Box */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-lg">
                    {/* Header Scanner */}
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    cameraActive ? 'animate-ping bg-emerald-400' : 'bg-slate-500'
                                }`}
                            />
                            <span className="text-sm font-bold">
                                Pemindai QR Code
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    qrIsAvailable
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                }`}
                            >
                                {qrIsAvailable ? 'QR Aktif' : 'QR Nonaktif'}
                            </span>
                        </div>
                    </div>

                    <div className="p-5">
                        {isCompletedToday ? (
                            <div className="rounded-2xl bg-emerald-500/10 p-6 text-center ring-1 ring-emerald-500/30">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2.2"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4.5 12.75l6 6 9-13.5"
                                        />
                                    </svg>
                                </div>
                                <p className="mt-3 text-sm font-bold text-emerald-300">
                                    Presensi Kehadiran Hari Ini Selesai
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                    Masuk: {myTodayAttendance.check_in} • Pulang:{' '}
                                    {myTodayAttendance.check_out}
                                </p>
                                {myTodayAttendance.distance_meters !== undefined &&
                                    myTodayAttendance.distance_meters !== null && (
                                        <p className="mt-1 text-[11px] text-emerald-400">
                                            Lokasi GPS: {myTodayAttendance.distance_meters} m dari titik resmi
                                        </p>
                                    )}
                            </div>
                        ) : (
                            <>
                                {/* Area Video Kamera */}
                                <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-slate-900 ring-2 ring-white/15">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`h-full w-full object-cover ${
                                            facingMode === 'user' ? '-scale-x-100' : ''
                                        }`}
                                    />

                                    {/* Scan Frame Overlay */}
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                                        <div
                                            className={`relative h-full w-full rounded-2xl border-2 transition-all duration-200 ${
                                                qrDetectedLock
                                                    ? 'scale-105 border-emerald-400 shadow-[0_0_0_9999px_rgba(6,78,59,0.45)]'
                                                    : 'border-indigo-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]'
                                            }`}
                                        >
                                            <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                                        </div>
                                    </div>

                                    {/* Floating Quick Flip Button di pojok video */}
                                    <button
                                        type="button"
                                        onClick={switchCameraFacing}
                                        disabled={isSwitchingCamera}
                                        className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/85 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-slate-800 active:scale-90"
                                        title="Ganti Kamera Depan / Belakang"
                                    >
                                        <svg
                                            className={`h-5 w-5 ${isSwitchingCamera ? 'animate-spin' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                                            />
                                        </svg>
                                    </button>

                                </div>

                                {/* Tombol Flip Kamera */}
                                <div className="mt-4 flex flex-col items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={switchCameraFacing}
                                        disabled={isSwitchingCamera}
                                        className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15 active:scale-98"
                                    >
                                        <svg
                                            className={`h-4 w-4 ${isSwitchingCamera ? 'animate-spin' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                                            />
                                        </svg>
                                        <span>
                                            {isSwitchingCamera ? 'Beralih Kamera...' : 'Flip Kamera'}
                                        </span>
                                    </button>

                                    <p className="text-center text-xs text-slate-400">
                                        {isSubmitting
                                            ? 'Memproses absensi...'
                                            : scanningStatus}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
