import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logout as apiLogout } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('jwt');
        if (token) {
            getMe()
                .then((u) => setUser(u))
                .catch(() => {
                    localStorage.removeItem('jwt');
                    navigate('/signin');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [navigate]);

    const logout = () => {
        apiLogout();
        setUser(null);
        navigate('/signin');
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
