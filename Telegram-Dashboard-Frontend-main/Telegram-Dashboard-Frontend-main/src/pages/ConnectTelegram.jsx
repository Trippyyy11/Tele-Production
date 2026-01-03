import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, ExternalLink } from 'lucide-react';
import { getMe, sendAuthCode, signIn, getAuthStatus } from '../services/api';

const ConnectTelegram = () => {
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1); // 1: status, 2: phone, 3: code
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState(null);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await getAuthStatus();
            setStatus(res);
            if (res.connected) {
                setStep(4); // already connected
            } else if (!res.configured) {
                setStep(0); // need to configure API keys first
            } else {
                setStep(2); // ready for phone login
            }
        } catch (err) {
            setError('Failed to check Telegram status');
        }
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await sendAuthCode(phone);
            setPhoneCodeHash(res.phone_code_hash);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await signIn({
                phone,
                code,
                phone_code_hash: phoneCodeHash
            });
            // Force re-fetch of global auth status
            queryClient.invalidateQueries(['authStatus']);

            // Optimistic update to reflect connection immediately
            queryClient.setQueryData(['authStatus'], (old) => ({
                ...(old || {}),
                connected: true,
                user: res.user || (old?.user) // Use returned user or keep existing
            }));

            setStep(4);
            checkStatus();
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    if (step === 0) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Connect Telegram</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                        You must first configure your Telegram API credentials in Settings before connecting.
                    </p>
                    <button
                        onClick={() => window.location.href = '/settings'}
                        className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600"
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Connect Telegram</h2>
                <div className="text-center text-gray-500 animate-pulse">Checking status...</div>
            </div>
        );
    }

    if (step === 4) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Telegram Connected</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-green-800">Successfully Connected</h3>
                        <p className="text-green-600 text-sm mt-1">
                            Your Telegram account is linked. You can now use all features.
                        </p>
                    </div>

                    {status?.user && (
                        <div className="w-full bg-white p-4 rounded-xl border border-green-100 text-left mt-4 shadow-sm">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Current Session</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-900">{status.user.firstName} {status.user.lastName}</p>
                                    <p className="text-sm text-gray-500">@{status.user.username || 'No Username'}</p>
                                </div>
                                <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Active</div>
                            </div>
                        </div>
                    )}

                    {status?.user?.username && (
                        <a
                            href={`https://t.me/${status.user.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors shadow-md shadow-blue-500/20"
                        >
                            <Send className="w-4 h-4" />
                            Open in Telegram
                        </a>
                    )}

                    <button
                        onClick={async () => {
                            if (confirm('Are you sure you want to disconnect?')) {
                                // Call logout API
                                // For now just redirect to settings or reload to force re-check
                                // Ideally we should have a disconnect endpoint
                                window.location.reload();
                            }
                        }}
                        className="mt-4 text-red-500 hover:text-red-700 text-sm font-bold underline"
                    >
                        Disconnect / Switch Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Connect Telegram</h2>

            {step === 2 && (
                <form onSubmit={handleSendCode} className="max-w-md space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                            placeholder="+1234567890"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2">Include country code (e.g. +91...)</p>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 rounded-lg font-bold shadow-lg shadow-primary-500/20 text-white transition-all"
                    >
                        {loading ? 'Sending Code...' : 'Send Code'}
                    </button>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={handleSignIn} className="max-w-md space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Verification Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all text-center tracking-widest text-xl"
                            placeholder="1 2 3 4 5"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 rounded-lg font-bold shadow-lg shadow-primary-500/20 text-white transition-all"
                    >
                        {loading ? 'Verifying...' : 'Sign In'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full text-sm text-gray-500 hover:text-primary-600 mt-4 font-medium"
                    >
                        Wrong number?
                    </button>
                </form>
            )}

            {error && (
                <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center text-sm font-bold">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ConnectTelegram;
