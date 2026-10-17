<?php

namespace Database\Factories;

use App\Models\AttendanceQrSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttendanceQrSession>
 */
class AttendanceQrSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = now()->toDateString();

        return [
            'date' => $date,
            'token' => AttendanceQrSession::generateToken($date),
            'title' => 'Sesi Presensi Harian',
            'is_active' => true,
            'created_by' => null,
        ];
    }
}
