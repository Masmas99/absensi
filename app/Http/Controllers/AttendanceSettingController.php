<?php

namespace App\Http\Controllers;

use App\Models\SchoolSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceSettingController extends Controller
{
    /**
     * Display the GPS location settings page.
     */
    public function edit(): Response
    {
        $setting = SchoolSetting::current();

        return Inertia::render('Settings/Gps', [
            'schoolSetting' => [
                'school_name' => $setting->school_name,
                'latitude' => (float) $setting->latitude,
                'longitude' => (float) $setting->longitude,
                'radius_meters' => (int) $setting->radius_meters,
                'enable_gps_validation' => (bool) $setting->enable_gps_validation,
            ],
        ]);
    }

    /**
     * Update attendance GPS location settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'school_name' => ['required', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['required', 'integer', 'min:10', 'max:5000'],
            'enable_gps_validation' => ['nullable', 'boolean'],
        ]);

        $validated['enable_gps_validation'] = $request->boolean('enable_gps_validation');

        $setting = SchoolSetting::current();
        $setting->update($validated);

        return back()->with('success', 'Pengaturan titik lokasi GPS presensi berhasil diperbarui.');
    }
}
