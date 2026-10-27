<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'superadmin@everly.com'],
            [
                'name' => 'Super Administrador',
                'password' => 'Everly2026!',
                'role' => 'super_admin',
            ]
        );
    }
}