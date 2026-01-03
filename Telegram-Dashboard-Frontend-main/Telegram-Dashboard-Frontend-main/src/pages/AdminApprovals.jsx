import { useState, useEffect } from 'react';
import { getApprovals, approveUser, denyUser } from '../services/api';

const AdminApprovals = () => {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('pending');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});

    useEffect(() => {
        fetchUsers();
    }, [filter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getApprovals(filter);
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        setActionLoading({ ...actionLoading, [userId]: 'approve' });
        try {
            await approveUser(userId);
            fetchUsers();
        } catch (err) {
            console.error('Approve failed:', err);
        } finally {
            setActionLoading({ ...actionLoading, [userId]: null });
        }
    };

    const handleDeny = async (userId) => {
        setActionLoading({ ...actionLoading, [userId]: 'deny' });
        try {
            await denyUser(userId);
            fetchUsers();
        } catch (err) {
            console.error('Deny failed:', err);
        } finally {
            setActionLoading({ ...actionLoading, [userId]: null });
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">User Approvals</h2>

            <div className="mb-4 flex gap-2">
                {['pending', 'approved', 'denied', 'all'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            filter === status
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center text-gray-500">Loading...</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-sm font-bold text-gray-700">Username</th>
                                <th className="text-left px-6 py-3 text-sm font-bold text-gray-700">Role</th>
                                <th className="text-left px-6 py-3 text-sm font-bold text-gray-700">Status</th>
                                <th className="text-left px-6 py-3 text-sm font-bold text-gray-700">Created</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.username}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{u.role}</td>
                                    <td className="px-6 py-4">
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
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {u.approvalStatus === 'pending' && (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleApprove(u._id)}
                                                    disabled={actionLoading[u._id] === 'approve'}
                                                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 disabled:opacity-50"
                                                >
                                                    {actionLoading[u._id] === 'approve' ? '...' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeny(u._id)}
                                                    disabled={actionLoading[u._id] === 'deny'}
                                                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 disabled:opacity-50"
                                                >
                                                    {actionLoading[u._id] === 'deny' ? '...' : 'Deny'}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No users found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminApprovals;
