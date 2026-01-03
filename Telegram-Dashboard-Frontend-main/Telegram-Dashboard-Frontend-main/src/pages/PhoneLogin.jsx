import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendAuthCode, signIn } from '../services/api';

const PhoneLogin = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: phone, 2: code
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            // Use direct axios call without JWT token for public status check
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            if (data.connected) {
                navigate('/');
            }
        } catch (err) {
            // Don't show error for status check, just continue
            console.log('Status check failed, continuing with phone login');
        }
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await sendAuthCode(phone);
            setPhoneCodeHash(res.phone_code_hash);
            setStep(2);
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
            await signIn({
                phone,
                code,
                phone_code_hash: phoneCodeHash
            });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md p-8 bg-white border border-gray-200 rounded-2xl card-shadow">
                <h2 className="text-2xl font-bold mb-6">Connect Telegram</h2>

                {step === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-6">
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

                {step === 2 && (
                    <form onSubmit={handleSignIn} className="space-y-6">
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
                            onClick={() => setStep(1)}
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
        </div>
    );
};

export default PhoneLogin;
