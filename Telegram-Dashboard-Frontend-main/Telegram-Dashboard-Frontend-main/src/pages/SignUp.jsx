import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../services/api';

const SignUp = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '', role: 'moderator' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await signup(form.username, form.password, form.role);
            if (res.status === 'pending_approval') {
                setSuccess(true);
            } else {
                // Admin auto-approved
                localStorage.setItem('jwt', res.token);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <div className="w-full max-w-md p-8 bg-white border border-gray-200 card-shadow rounded-2xl">
                    <h2 className="text-2xl font-bold text-center mb-4">Signup Successful</h2>
                    <p className="text-center text-gray-600 mb-6">
                        Your account is awaiting admin approval. You’ll be able to log in once approved.
                    </p>
                    <button onClick={() => navigate('/login')} className="w-full py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md p-8 bg-white border border-gray-200 card-shadow rounded-2xl relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

                <h2 className="text-3xl font-extrabold mb-2 text-center text-gray-900">Create Account</h2>
                <p className="text-gray-500 mb-8 text-center text-sm">Choose your role and set credentials</p>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                            placeholder="Choose a username"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                            placeholder="Set a strong password"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        >
                            <option value="moderator">Moderator</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 rounded-lg font-bold shadow-lg shadow-primary-500/20 text-white transition-all"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={() => navigate('/login')} className="text-sm text-primary-600 hover:underline font-medium">
                        Already have an account? Log in
                    </button>
                </div>

                {error && (
                    <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center text-sm font-bold">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignUp;
