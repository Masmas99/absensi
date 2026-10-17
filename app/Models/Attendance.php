<?php

namespace App\Models;

use Database\Factories\AttendanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'date', 'check_in', 'check_out', 'status', 'notes'])]
class Attendance extends Model
{
    /** @use HasFactory<AttendanceFactory> */
    use HasFactory;

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'status_label',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }

    /**
     * Get the user that owns the attendance record.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the human-readable attendance status label.
     */
    public function statusLabel(): string
    {
        return match ($this->status) {
            'present' => 'Hadir (Tepat Waktu)',
            'late' => 'Terlambat',
            'leave' => 'Izin / Cuti',
            'sick' => 'Sakit',
            'absent' => 'Alpha',
            default => 'Hadir',
        };
    }

    /**
     * Accessor for the status_label attribute.
     */
    public function getStatusLabelAttribute(): string
    {
        return $this->statusLabel();
    }
}
