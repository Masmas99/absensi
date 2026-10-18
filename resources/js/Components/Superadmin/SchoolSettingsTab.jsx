import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function SchoolSettingsTab({ schoolSetting = {} }) {
    const { data, setData, patch, processing, errors } = useForm({
        school_name: schoolSetting.school_name ?? 'SMK Negeri 1',
        latitude: schoolSetting.latitude ?? -6.2088,
        longitude: schoolSetting.longitude ?? 106.8456,
        radius_meters: schoolSetting.radius_meters ?? 100,
        enable_gps_validation: schoolSetting.enable_gps_validation ?? true,
    });

    const [geoLoading, setGeoLoading] = useState(false);
    const [geoMsg, setGeoMsg] = useState('');
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        setData({
            school_name: schoolSetting.school_name ?? 'SMK Negeri 1',
            latitude: schoolSetting.latitude ?? -6.2088,
            longitude: schoolSetting.longitude ?? 106.8456,
            radius_meters: schoolSetting.radius_meters ?? 100,
            enable_gps_validation: schoolSetting.enable_gps_validation ?? true,
        });
    }, [schoolSetting]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setGeoMsg('Browser perangkat Anda tidak mendukung pendeteksi GPS.');
            return;
        }

        setGeoLoading(true);
        setGeoMsg('');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setData((prev) => ({
                    ...prev,
                    latitude: parseFloat(pos.coords.latitude.toFixed(7)),
                    longitude: parseFloat(pos.coords.longitude.toFixed(7)),
                }));
                setGeoLoading(false);
                setGeoMsg('Koordinat GPS berhasil diperoleh dari lokasi perangkat Anda.');
            },
            (err) => {
                setGeoLoading(false);
                setGeoMsg(`Gagal membaca GPS: ${err.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSavedSuccess(false);
        patch(route('school.settings.update'), {
            preserveScroll: true,
            onSuccess: () => {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 5000);
            },
        });
    };

    const mapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-base font-bold text-slate-900">
                        Pengaturan Titik Lokasi GPS Presensi
                    </h3>
                    <p className="text-xs text-slate-500">
                        Konfigurasi titik pusat koordinat dan radius toleransi jarak (meter) untuk validasi absensi QR Code
                    </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Sistem Berbasis Radius GPS
                </span>
            </div>

            {savedSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-2xs">
                    ✓ Pengaturan titik lokasi GPS presensi berhasil disimpan dan langsung aktif!
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
                {/* School / Office Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700">Nama Instansi / Kantor / Sekolah</label>
                    <input
                        type="text"
                        required
                        value={data.school_name}
                        onChange={(e) => setData('school_name', e.target.value)}
                        className="mt-1 w-full rounded-xl border-slate-200 text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {errors.school_name && <p className="mt-1 text-[11px] text-rose-600">{errors.school_name}</p>}
                </div>

                {/* Geolocation Section */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h4 className="text-xs font-bold text-indigo-950">
                                Titik Koordinat GPS Lokasi Presensi
                            </h4>
                            <p className="text-[11px] text-indigo-700">
                                Siswa wajib berada di dalam radius titik ini agar absensi QR Code diterima
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs transition hover:bg-indigo-50"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                Buka di Google Maps
                            </a>
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={geoLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-500 disabled:opacity-50"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                {geoLoading ? 'Membaca GPS...' : 'Gunakan Lokasi GPS Saya Saat Ini'}
                            </button>
                        </div>
                    </div>

                    {geoMsg && (
                        <p className="mt-2 text-xs font-medium text-indigo-800">{geoMsg}</p>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-700">Latitude (Garis Lintang)</label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={data.latitude}
                                onChange={(e) => setData('latitude', e.target.value)}
                                className="mt-1 w-full rounded-xl border-slate-200 font-mono text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.latitude && <p className="mt-1 text-[11px] text-rose-600">{errors.latitude}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-700">Longitude (Garis Bujur)</label>
                            <input
                                type="number"
                                step="any"
                                required
                                value={data.longitude}
                                onChange={(e) => setData('longitude', e.target.value)}
                                className="mt-1 w-full rounded-xl border-slate-200 font-mono text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.longitude && <p className="mt-1 text-[11px] text-rose-600">{errors.longitude}</p>}
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-700">Radius Toleransi Presensi (Meter)</label>
                            <input
                                type="number"
                                min="10"
                                max="5000"
                                required
                                value={data.radius_meters}
                                onChange={(e) => setData('radius_meters', e.target.value)}
                                placeholder="cth. 100"
                                className="mt-1 w-full rounded-xl border-slate-200 text-xs shadow-2xs focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.radius_meters && <p className="mt-1 text-[11px] text-rose-600">{errors.radius_meters}</p>}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="enable_gps"
                            checked={data.enable_gps_validation}
                            onChange={(e) => setData('enable_gps_validation', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="enable_gps" className="text-xs font-semibold text-slate-800">
                            Wajibkan validasi lokasi GPS saat Siswa scan QR Code (presensi ditolak jika jarak &gt; radius toleransi)
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end border-t border-slate-100 pt-4">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {processing ? 'Menyimpan Pengaturan...' : 'Simpan Perubahan Titik GPS'}
                    </button>
                </div>
            </form>
        </div>
    );
}
