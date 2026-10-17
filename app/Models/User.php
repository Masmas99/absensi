<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role', 'role_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => UserRole::Employee->value,
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'role_label',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    /**
     * Get the role record associated with the user.
     *
     * @return BelongsTo<Role, $this>
     */
    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /**
     * Get the attendance records for the user.
     *
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Determine if the user has one of the given roles.
     *
     * @param  UserRole|string|array<int, UserRole|string>  $roles
     */
    public function hasRole(UserRole|string|array $roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];
        $currentRole = $this->role instanceof UserRole ? $this->role->value : (string) $this->role;

        foreach ($roles as $role) {
            $expected = $role instanceof UserRole ? $role->value : (string) $role;

            if ($currentRole === $expected) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine if the user is a Superadmin.
     */
    public function isSuperadmin(): bool
    {
        return $this->hasRole(UserRole::Superadmin);
    }

    /**
     * Determine if the user is an HR Admin.
     */
    public function isHrAdmin(): bool
    {
        return $this->hasRole(UserRole::HrAdmin);
    }

    /**
     * Determine if the user is a Manager.
     */
    public function isManager(): bool
    {
        return $this->hasRole(UserRole::Manager);
    }

    /**
     * Determine if the user is an Employee (Karyawan).
     */
    public function isEmployee(): bool
    {
        return $this->hasRole(UserRole::Employee);
    }

    /**
     * Get the display label for the user's role.
     */
    public function roleLabel(): string
    {
        if ($this->role instanceof UserRole) {
            return $this->role->label();
        }

        return UserRole::tryFrom((string) $this->role)?->label() ?? 'Karyawan (Employee)';
    }

    /**
     * Accessor for the role_label attribute.
     */
    public function getRoleLabelAttribute(): string
    {
        return $this->roleLabel();
    }
}
