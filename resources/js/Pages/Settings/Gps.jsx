import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SchoolSettingsTab from '@/Components/Superadmin/SchoolSettingsTab';
import { Head } from '@inertiajs/react';

export default function GpsSettings({ schoolSetting = {} }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold leading-tight text-slate-900">
                        Pengaturan Lokasi GPS Presensi
                    </h2>
                    <p className="text-xs text-slate-500">
                        Atur koordinat pusat lokasi dan toleransi radius meter untuk presensi QR Code
                    </p>
                </div>
            }
        >
            <Head title="Pengaturan Lokasi GPS Presensi" />

            <div className="mx-auto max-w-5xl space-y-6">
                <SchoolSettingsTab schoolSetting={schoolSetting} />
            </div>
        </AuthenticatedLayout>
    );
}
