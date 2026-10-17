<?php

namespace App\Models;

use Database\Factories\AttendanceQrSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['date', 'token', 'title', 'is_active', 'created_by'])]
class AttendanceQrSession extends Model
{
    /** @use HasFactory<AttendanceQrSessionFactory> */
    use HasFactory;

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
     * Generate a unique QR token for a given date.
     */
    public static function generateToken(?string $date = null): string
    {
        $datePart = str_replace('-', '', $date ?? now()->toDateString());

        return 'ABSEN-'.$datePart.'-'.Str::upper(Str::random(6));
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
