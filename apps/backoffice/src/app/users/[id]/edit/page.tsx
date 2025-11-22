'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Tenant {
    id: string;
    name: string;
    key: string;
}

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'staff',
        isMaster: false,
    });

    useEffect(() => {
        if (userId) {
            fetchTenants();
            fetchUser();
        }
    }, [userId]);

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

    const fetchUser = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            if (response.ok) {
                setFormData({
                    name: data.user.name || '',
                    email: data.user.email || '',
                    role: data.user.role || 'staff',
                    isMaster: data.user.isMaster === true,
                });
                // Set selected tenants from user data
                if (data.user.tenants && Array.isArray(data.user.tenants)) {
                    setSelectedTenants(data.user.tenants);
                } else if (data.user.expand?.tenants) {
                    setSelectedTenants(data.user.expand.tenants.map((t: any) => t.id));
                }
            } else {
                setError('Failed to fetch user');
            }
        } catch (err) {
            setError('Error fetching user');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setSaving(true);
        setError('');

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    role: formData.role,
                    isMaster: formData.isMaster,
                    tenants: formData.isMaster ? [] : selectedTenants, // Master users don't need tenant assignment
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update user');
            }

            router.push('/users');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center mb-6">
                    <Link href="/users" className="text-gray-500 hover:text-gray-700 mr-4">
                        ← Back
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
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
                                Email
                            </label>
                            <input
                                type="email"
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                                value={formData.email}
                            />
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>

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
                                Master users have access to all restaurants/tenants and can switch between them
                            </p>
                        </div>

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
                                disabled={saving}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
