'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Tenant {
    id: string;
    name: string;
    key: string;
}

export default function NewUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMasterUser, setIsMasterUser] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: 'staff',
        isMaster: false,
    });

    useEffect(() => {
        fetchCurrentUser();
        fetchTenants();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            if (response.ok && data.user) {
                setCurrentUser(data.user);
                setIsMasterUser(data.user.isMaster === true || data.user.role === 'admin');
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
        }
    };

    const fetchTenants = async () => {
        try {
            const response = await fetch('/api/tenants');
            const data = await response.json();
            if (response.ok) {
                setTenants(data.tenants || []);
            }
        } catch (err) {
            console.error('Error fetching tenants:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.passwordConfirm) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tenants: formData.isMaster ? [] : selectedTenants, // Master users don't need tenant assignment
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create user');
            }

            router.push('/users');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center mb-6">
                    <Link href="/users" className="text-gray-500 hover:text-gray-700 mr-4">
                        ← Back
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.passwordConfirm}
                                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {isMasterUser && (
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.isMaster}
                                        onChange={(e) => setFormData({ ...formData, isMaster: e.target.checked })}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Master User</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Master users have access to all restaurants/tenants and can switch between them. Only master users can create other master users.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tenants
                            </label>
                            <div className={`border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto ${formData.isMaster ? 'bg-gray-50 opacity-60' : ''}`}>
                                {tenants.length === 0 ? (
                                    <p className="text-sm text-gray-500">No tenants available</p>
                                ) : (
                                    tenants.map((tenant) => (
                                        <label key={tenant.id} className={`flex items-center py-2 cursor-pointer hover:bg-gray-50 ${formData.isMaster ? 'cursor-not-allowed' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTenants.includes(tenant.id)}
                                                disabled={formData.isMaster}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTenants([...selectedTenants, tenant.id]);
                                                    } else {
                                                        setSelectedTenants(selectedTenants.filter(id => id !== tenant.id));
                                                    }
                                                }}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700">{tenant.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.isMaster 
                                    ? 'Master users have access to all tenants. No need to select specific tenants.' 
                                    : 'Select one or more tenants this user will have access to'}
                            </p>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
