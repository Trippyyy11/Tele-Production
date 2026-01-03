import { useState, useEffect } from 'react';
import { getUsers, getUserSummary, changeUserRole } from '../services/api';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [roleLoading, setRoleLoading] = useState({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async (userId) => {
        setSummaryLoading(true);
        try {
            const data = await getUserSummary(userId);
            setSummary(data);
        } catch (err) {
            console.error('Failed to fetch summary:', err);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setRoleLoading({ ...roleLoading, [userId]: true });
        try {
            await changeUserRole(userId, newRole);
            fetchUsers();
            if (selectedUser?._id === userId) {
                fetchSummary(userId);
            }
        } catch (err) {
            console.error('Failed to change role:', err);
        } finally {
            setRoleLoading({ ...roleLoading, [userId]: false });
        }
    };

    const selectUser = (user) => {
        setSelectedUser(user);
        fetchSummary(user._id);
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">User Management</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">All Users</h3>
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading...</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-sm font-bold text-gray-700">Username</th>
                                        <th className="text-left px-4 py-2 text-sm font-bold text-gray-700">Role</th>
                                        <th className="text-left px-4 py-2 text-sm font-bold text-gray-700">Status</th>
                                        <th className="text-left px-4 py-2 text-sm font-bold text-gray-700">Last Active</th>
                                        <th className="px-4 py-2 text-sm font-bold text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr
                                            key={u._id}
                                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                                                selectedUser?._id === u._id ? 'bg-primary-50' : ''
                                            }`}
                                            onClick={() => selectUser(u)}
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.username}</td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                    disabled={roleLoading[u._id]}
                                                    className="text-xs px-2 py-1 rounded border border-gray-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="moderator">Moderator</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                                        u.approvalStatus === 'approved'
                                                            ? 'bg-green-100 text-green-700'
                                                            : u.approvalStatus === 'denied'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                    }`}
                                                >
                                                    {u.approvalStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectUser(u);
                                                    }}
                                                    className="text-xs text-primary-600 hover:underline font-medium"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div>
                    {selectedUser ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-900 mb-4">User Summary</h3>
                            {summaryLoading ? (
                                <div className="text-center text-gray-500">Loading...</div>
                            ) : summary ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Username</p>
                                        <p className="font-bold">{summary.user.username}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Role</p>
                                        <p className="capitalize font-bold">{summary.user.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Status</p>
                                        <span
                                            className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                                summary.user.approvalStatus === 'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : summary.user.approvalStatus === 'denied'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}
                                        >
                                            {summary.user.approvalStatus}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Last Active</p>
                                        <p className="text-sm">{summary.user.lastActiveAt ? new Date(summary.user.lastActiveAt).toLocaleString() : 'Never'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500">Folders</p>
                                            <p className="text-2xl font-bold text-primary-600">{summary.kpis.foldersCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Tasks</p>
                                            <p className="text-2xl font-bold text-primary-600">{summary.kpis.tasksCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Sent</p>
                                            <p className="text-2xl font-bold text-green-600">{summary.kpis.tasksSentCount}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm font-bold text-gray-700 mb-2">Recent Tasks</p>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {summary.recentTasks.map((t) => (
                                                <div key={t.taskId} className="text-xs bg-gray-50 rounded p-2">
                                                    <p className="font-medium">{t.name}</p>
                                                    <p className="text-gray-500">{t.type} • {t.status}</p>
                                                </div>
                                            ))}
                                            {summary.recentTasks.length === 0 && (
                                                <p className="text-xs text-gray-500">No tasks yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                            Select a user to view summary
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
