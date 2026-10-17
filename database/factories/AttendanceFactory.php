<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'date' => now()->toDateString(),
            'check_in' => '07:55:00',
            'check_out' => '17:02:00',
            'status' => 'present',
            'notes' => 'WFO - Kantor Pusat',
        ];
    }

    /**
     * Indicate that the attendance was late.
     */
    public function late(): static
    {
        return $this->state(fn (array $attributes) => [
            'check_in' => '08:27:00',
            'status' => 'late',
            'notes' => 'Terlambat karena kendala lalu lintas',
        ]);
    }
}
