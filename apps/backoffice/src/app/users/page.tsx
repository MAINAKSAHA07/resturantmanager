'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isMaster?: boolean;
    created: string;
    expand?: {
        tenants?: { name: string }[];
    };
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setError(null);
            setLoading(true);
            const response = await fetch('/api/users');
            const data = await response.json();
            
            if (response.ok) {
                const fetchedUsers = data.users || [];
                console.log(`Users page: Received ${fetchedUsers.length} users`, fetchedUsers);
                setUsers(fetchedUsers);
            } else {
                // Handle different error statuses
                if (response.status === 401) {
                    setError('Unauthorized: Please log in again.');
                } else if (response.status === 403) {
                    setError('Forbidden: You do not have permission to view users.');
                } else {
                    setError(data.error || `Failed to fetch users: ${response.statusText}`);
                }
                console.error('Error fetching users:', { status: response.status, error: data.error });
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to fetch users. Please check your connection.';
            setError(errorMessage);
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Users</h1>
                    <Link
                        href="/users/new"
                        className="btn-primary px-4 py-2 text-sm"
                    >
                        Add User
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-accent-pink/10 border-l-4 border-accent-pink rounded-lg">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-accent-pink">{error}</p>
                            <button
                                onClick={fetchUsers}
                                className="text-sm text-accent-pink hover:text-accent-pink/80 underline"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {users.length === 0 && !error ? (
                    <div className="card text-center py-12">
                        <p className="text-gray-600 text-lg mb-4">No users found.</p>
                        <Link href="/users/new" className="btn-primary inline-block">
                            Add your first user
                        </Link>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-accent-blue to-accent-purple text-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tenants
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                                user.role === 'admin' 
                                                    ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30' :
                                                user.role === 'manager' 
                                                    ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30' :
                                                    'bg-accent-gray/20 text-accent-gray border-accent-gray/30'
                                                }`}>
                                                {user.role || 'staff'}
                                            </span>
                                            {user.isMaster && (
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-accent-yellow/20 text-accent-brown border border-accent-yellow/30">
                                                    Master
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.isMaster ? (
                                                <span className="px-2 py-0.5 text-xs bg-yellow-50 text-yellow-700 rounded border border-yellow-200">
                                                    All Restaurants
                                                </span>
                                            ) : (() => {
                                                const tenants = user.expand?.tenants;
                                                return tenants && tenants.length > 0 ? (
                                                    tenants.map((t, i) => (
                                                        <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded border border-gray-200">
                                                            {t.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400 text-xs">None</span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.created).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link 
                                            href={`/users/${user.id}/edit`} 
                                            className="text-accent-blue hover:text-accent-purple font-medium transition-colors duration-200"
                                        >
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    );
}
