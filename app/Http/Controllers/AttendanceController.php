<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceQrSession;
use App\Models\SchoolSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    /**
     * Display the dedicated camera QR scanner page (/presensi).
     */
    public function presensi(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'Superadmin merupakan penyedia QR Code dan tidak melakukan presensi kehadiran.');
        }

        $today = now()->toDateString();
        $todayQrSession = AttendanceQrSession::ensureSingleSession($user->id);
        $schoolSetting = SchoolSetting::current();

        $myTodayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        return Inertia::render('Attendance/Presensi', [
            'myTodayAttendance' => $myTodayAttendance,
            'todayQrSession' => [
                'id' => $todayQrSession->id,
                'date' => $todayQrSession->date?->format('Y-m-d'),
                'title' => $todayQrSession->title,
                'is_active' => $todayQrSession->is_active,
            ],
            'schoolSetting' => [
                'school_name' => $schoolSetting->school_name,
                'latitude' => (float) $schoolSetting->latitude,
                'longitude' => (float) $schoolSetting->longitude,
                'radius_meters' => (int) $schoolSetting->radius_meters,
                'enable_gps_validation' => (bool) $schoolSetting->enable_gps_validation,
            ],
        ]);
    }

    /**
     * Display the dedicated attendance history page (/riwayat).
     */
    public function history(Request $request): Response
    {
        $user = $request->user();
        $today = now()->toDateString();

        $myTodayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $attendances = Attendance::query()
            ->where('user_id', $user->id)
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(31)
            ->get();

        $monthCounts = Attendance::query()
            ->where('user_id', $user->id)
            ->whereYear('date', now()->year)
            ->whereMonth('date', now()->month)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('Attendance/History', [
            'myTodayAttendance' => $myTodayAttendance,
            'attendances' => $attendances,
            'monthlySummary' => [
                'present' => (int) ($monthCounts['present'] ?? 0),
                'late' => (int) ($monthCounts['late'] ?? 0),
                'leave' => (int) (($monthCounts['leave'] ?? 0) + ($monthCounts['sick'] ?? 0)),
            ],
        ]);
    }

    /**
     * Display the dedicated leave and sick request page (/izin).
     */
    public function leave(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'Superadmin tidak memiliki menu pengajuan izin/cuti.');
        }

        $today = now()->toDateString();

        $myTodayAttendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $leaveAttendances = Attendance::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['leave', 'sick'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        $monthCounts = Attendance::query()
            ->where('user_id', $user->id)
            ->whereYear('date', now()->year)
            ->whereMonth('date', now()->month)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $yearLeaveCount = Attendance::query()
            ->where('user_id', $user->id)
            ->whereYear('date', now()->year)
            ->where('status', 'leave')
            ->count();

        return Inertia::render('Attendance/Leave', [
            'todayDate' => $today,
            'myTodayAttendance' => $myTodayAttendance,
            'leaveAttendances' => $leaveAttendances,
            'leaveSummary' => [
                'leave_month' => (int) ($monthCounts['leave'] ?? 0),
                'sick_month' => (int) ($monthCounts['sick'] ?? 0),
                'remaining_quota' => max(0, 12 - $yearLeaveCount),
            ],
        ]);
    }

    /**
     * Store a leave/cuti or sick submission for the authenticated user.
     */
    public function storeLeave(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return back()->with('error', 'Superadmin tidak dapat mengajukan izin/cuti.');
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'status' => ['required', Rule::in(['leave', 'sick'])],
            'notes' => ['required', 'string', 'max:255'],
        ]);

        $existing = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $validated['date'])
            ->first();

        if ($existing && $existing->check_in) {
            return back()->with(
                'error',
                'Anda sudah tercatat hadir (Check-In) pada tanggal '.$validated['date'].' sehingga tidak dapat mengajukan izin/sakit.',
            );
        }

        Attendance::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'date' => $validated['date'],
            ],
            [
                'check_in' => null,
                'check_out' => null,
                'status' => $validated['status'],
                'notes' => $validated['notes'],
            ],
        );

        $label = $validated['status'] === 'sick' ? 'Sakit' : 'Izin / Cuti';

        return back()->with(
            'success',
            "Pengajuan {$label} untuk tanggal {$validated['date']} berhasil disimpan.",
        );
    }

    /**
     * Update the single official QR Code session title/status (Superadmin action).
     */
    public function generateQr(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:100'],
        ]);

        $qrSession = AttendanceQrSession::ensureSingleSession($request->user()->id);
        $qrSession->update([
            'token' => AttendanceQrSession::SINGLE_TOKEN,
            'title' => $validated['title'] ?? 'Presensi QR Code Utama',
            'is_active' => true,
            'created_by' => $request->user()->id,
        ]);

        return back()->with('success', "Pengaturan QR Code berhasil diperbarui ({$qrSession->token}).");
    }

    /**
     * Toggle active status of the single official QR Code session (Superadmin action).
     */
    public function toggleQr(Request $request): RedirectResponse
    {
        $qrSession = AttendanceQrSession::ensureSingleSession($request->user()->id);

        $qrSession->update([
            'is_active' => ! $qrSession->is_active,
        ]);

        $statusText = $qrSession->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Sesi QR Code absensi berhasil {$statusText}.");
    }

    /**
     * Calculate distance between two coordinates in meters using the Haversine formula.
     */
    private function calculateDistanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $earthRadius = 6371000; // in meters
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return (int) round($earthRadius * $c);
    }

    /**
     * Record today's check-in for the authenticated user using Superadmin's QR token and GPS coordinates.
     */
    public function checkIn(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return back()->with('error', 'Superadmin merupakan penyedia QR Code dan tidak melakukan presensi kehadiran.');
        }

        $validated = $request->validate([
            'qr_token' => ['required', 'string'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $today = now()->toDateString();
        $qrSession = AttendanceQrSession::query()
            ->whereDate('date', $today)
            ->where('is_active', true)
            ->first() ?? AttendanceQrSession::query()->where('is_active', true)->first();

        $submittedToken = strtoupper(trim($validated['qr_token']));

        if (! $qrSession || $submittedToken !== strtoupper($qrSession->token)) {
            $message = 'Kode QR tidak valid atau sesi absensi belum diaktifkan oleh Superadmin.';

            return back()->withErrors(['qr_token' => $message])->with('error', $message);
        }

        $existing = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if ($existing && $existing->check_in) {
            return back()->with('error', 'Anda sudah melakukan Check-In hari ini pada pukul '.$existing->check_in.'.');
        }

        // Validate GPS location (Wajib sesuai radius GPS)
        $setting = SchoolSetting::current();
        $userLat = $request->filled('latitude') ? (float) $request->input('latitude') : null;
        $userLon = $request->filled('longitude') ? (float) $request->input('longitude') : null;

        if ($userLat === null || $userLon === null) {
            $errorMsg = 'Presensi ditolak: Koordinat lokasi GPS tidak terdeteksi. Harap aktifkan izin lokasi/GPS pada browser perangkat Anda.';

            return back()->withErrors(['location' => $errorMsg])->with('error', $errorMsg);
        }

        $distanceMeters = $this->calculateDistanceMeters(
            $userLat,
            $userLon,
            (float) $setting->latitude,
            (float) $setting->longitude
        );

        $allowedRadius = (int) ($setting->radius_meters ?: 100);

        if ($distanceMeters > $allowedRadius) {
            $errorMsg = "Presensi ditolak! Posisi Anda berada di luar radius lokasi yang diizinkan (Jarak Anda: {$distanceMeters} m, Maksimal: {$allowedRadius} m).";

            return back()->withErrors(['location' => $errorMsg])->with('error', $errorMsg);
        }

        $currentTime = now()->format('H:i:s');
        $gpsInfo = " (GPS: {$distanceMeters}m)";
        $note = $validated['notes'] ?? "Scan QR - Hadir{$gpsInfo}";

        Attendance::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'date' => $today,
            ],
            [
                'check_in' => $currentTime,
                'status' => 'present',
                'latitude' => $userLat,
                'longitude' => $userLon,
                'distance_meters' => $distanceMeters,
                'notes' => $note,
            ],
        );

        $gpsMsg = " Lokasi GPS terverifikasi ({$distanceMeters}m dari titik lokasi).";

        return back()->with('success', "Scan QR berhasil!{$gpsMsg} Check-In tercatat pada pukul {$currentTime} WIB.");
    }

    /**
     * Record today's check-out for the authenticated user using Superadmin's QR token and GPS coordinates.
     */
    public function checkOut(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isSuperadmin()) {
            return back()->with('error', 'Superadmin merupakan penyedia QR Code dan tidak melakukan presensi kehadiran.');
        }

        $validated = $request->validate([
            'qr_token' => ['required', 'string'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $today = now()->toDateString();
        $qrSession = AttendanceQrSession::query()
            ->whereDate('date', $today)
            ->where('is_active', true)
            ->first() ?? AttendanceQrSession::query()->where('is_active', true)->first();

        $submittedToken = strtoupper(trim($validated['qr_token']));

        if (! $qrSession || $submittedToken !== strtoupper($qrSession->token)) {
            $message = 'Kode QR tidak valid atau sesi absensi belum diaktifkan oleh Superadmin.';

            return back()->withErrors(['qr_token' => $message])->with('error', $message);
        }

        $attendance = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if (! $attendance || ! $attendance->check_in) {
            return back()->with('error', 'Anda belum melakukan Check-In hari ini.');
        }

        if ($attendance->check_out) {
            return back()->with('error', 'Anda sudah melakukan Check-Out hari ini pada pukul '.$attendance->check_out.'.');
        }

        $setting = SchoolSetting::current();

        // Validate GPS location (Wajib sesuai radius GPS)
        $userLat = $request->filled('latitude') ? (float) $request->input('latitude') : null;
        $userLon = $request->filled('longitude') ? (float) $request->input('longitude') : null;

        if ($userLat === null || $userLon === null) {
            $errorMsg = 'Presensi ditolak: Koordinat lokasi GPS tidak terdeteksi. Harap aktifkan izin lokasi/GPS pada browser perangkat Anda.';

            return back()->withErrors(['location' => $errorMsg])->with('error', $errorMsg);
        }

        $distanceMeters = $this->calculateDistanceMeters(
            $userLat,
            $userLon,
            (float) $setting->latitude,
            (float) $setting->longitude
        );

        $allowedRadius = (int) ($setting->radius_meters ?: 100);

        if ($distanceMeters > $allowedRadius) {
            $errorMsg = "Presensi ditolak! Posisi Anda berada di luar radius lokasi yang diizinkan (Jarak Anda: {$distanceMeters} m, Maksimal: {$allowedRadius} m).";

            return back()->withErrors(['location' => $errorMsg])->with('error', $errorMsg);
        }

        $currentTime = now()->format('H:i:s');

        $attendance->update([
            'check_out' => $currentTime,
            'latitude' => $userLat ?? $attendance->latitude,
            'longitude' => $userLon ?? $attendance->longitude,
            'distance_meters' => $distanceMeters ?? $attendance->distance_meters,
        ]);

        $gpsMsg = " Lokasi GPS terverifikasi ({$distanceMeters}m dari titik lokasi).";

        return back()->with('success', "Scan QR berhasil!{$gpsMsg} Check-Out tercatat pada pukul {$currentTime} WIB.");
    }

    /**
     * Update an employee's today attendance status (Superadmin action).
     */
    public function updateEmployeeAttendance(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['present', 'late', 'leave', 'sick', 'not_yet'])],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $today = now()->toDateString();

        if ($validated['status'] === 'not_yet') {
            Attendance::query()
                ->where('user_id', $user->id)
                ->whereDate('date', $today)
                ->delete();

            return back()->with('success', "Status kehadiran {$user->name} hari ini direset menjadi Belum Absen.");
        }

        $existing = Attendance::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        $isPresentOrLate = in_array($validated['status'], ['present', 'late'], true);
        $defaultCheckIn = $validated['status'] === 'late' ? '08:25:00' : '08:00:00';

        $defaultNotes = match ($validated['status']) {
            'present' => 'Diverifikasi Hadir oleh Superadmin',
            'late' => 'Diverifikasi Terlambat oleh Superadmin',
            'leave' => 'Izin / Cuti (Disetujui Superadmin)',
            'sick' => 'Sakit (Disetujui Superadmin)',
            default => '-',
        };

        Attendance::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'date' => $today,
            ],
            [
                'check_in' => $isPresentOrLate ? ($existing?->check_in ?? $defaultCheckIn) : null,
                'check_out' => $isPresentOrLate ? $existing?->check_out : null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?: $defaultNotes,
            ],
        );

        return back()->with('success', "Status kehadiran {$user->name} berhasil diperbarui.");
    }
}
