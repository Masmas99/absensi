<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\AttendanceQrSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['date', 'token', 'title', 'is_active', 'created_by'])]
class AttendanceQrSession extends Model
{
    /** @use HasFactory<AttendanceQrSessionFactory> */
    use HasFactory;

    public const SINGLE_TOKEN = 'ABSENSI-QR-RESMI-KANTOR';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Return the single official QR token.
     */
    public static function generateToken(?string $date = null): string
    {
        return self::SINGLE_TOKEN;
    }

    /**
     * Ensure only one single official QR Code session exists and is active for today.
     */
    public static function ensureSingleSession(?int $fallbackUserId = null): self
    {
        $today = now()->toDateString();

        $superadminId = User::query()
            ->where('role', UserRole::Superadmin)
            ->value('id') ?? $fallbackUserId;

        $session = self::query()
            ->whereDate('date', $today)
            ->first() ?? self::query()->first();

        if (! $session) {
            return self::query()->create([
                'date' => $today,
                'token' => self::SINGLE_TOKEN,
                'title' => 'Presensi Reguler Kantor Pusat',
                'is_active' => true,
                'created_by' => $superadminId,
            ]);
        }

        // Delete any extra duplicate QR rows so only 1 QR exists
        self::query()->where('id', '!=', $session->id)->delete();

        $updates = [];
        if ($session->date?->format('Y-m-d') !== $today) {
            $updates['date'] = $today;
        }
        if (str_starts_with((string) $session->token, 'ABSEN-20')) {
            $updates['token'] = self::SINGLE_TOKEN;
        }

        if ($updates !== []) {
            $session->update($updates);
        }

        return $session;
    }

    /**
     * Get the Superadmin user who created the QR session.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
