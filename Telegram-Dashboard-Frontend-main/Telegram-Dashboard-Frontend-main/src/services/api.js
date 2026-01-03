import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
    baseURL: API_BASE_URL,
})

// Add JWT token to requests if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt')
    console.log(`[API] Request to ${config.url}`, { tokenExists: !!token });

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log('[API] Attached Auth Header');
    } else {
        console.warn('[API] No token found in localStorage');
    }
    return config
})

// ============================================
// Account API (JWT auth)
// ============================================
export const signup = async (username, password, role) => {
    const { data } = await api.post('/account/signup', { username, password, role })
    return data
}

export const login = async (username, password) => {
    const { data } = await api.post('/account/login', { username, password })
    if (data.token) {
        localStorage.setItem('jwt', data.token)
    }
    return data
}

export const getMe = async () => {
    const { data } = await api.get('/account/me')
    return data
}

export const logout = () => {
    localStorage.removeItem('jwt')
}

// ============================================
// Admin API
// ============================================
export const getApprovals = async (status = 'pending') => {
    const { data } = await api.get(`/admin/approvals?status=${status}`)
    return data
}

export const approveUser = async (userId) => {
    const { data } = await api.post(`/admin/users/${userId}/approve`)
    return data
}

export const denyUser = async (userId) => {
    const { data } = await api.post(`/admin/users/${userId}/deny`)
    return data
}

export const getUsers = async () => {
    const { data } = await api.get('/admin/users')
    return data
}

export const getUserSummary = async (userId) => {
    const { data } = await api.get(`/admin/users/${userId}/summary`)
    return data
}

export const changeUserRole = async (userId, role) => {
    const { data } = await api.patch(`/admin/users/${userId}/role`, { role })
    return data
}

// ============================================
// Settings API
// ============================================
export const getSettings = async () => {
    const { data } = await api.get('/settings')
    return data
}

export const updateSettings = async (settingsData) => {
    const { data } = await api.post('/settings', settingsData)
    return data
}

// ============================================
// Folder API
// ============================================
export const getFolders = async () => {
    const { data } = await api.get('/folders')
    return data
}

export const createFolder = async (folderData) => {
    const { data } = await api.post('/folders', folderData)
    return data
}

export const updateFolder = async (id, folderData) => {
    const { data } = await api.put(`/folders/${id}`, folderData)
    return data
}

export const deleteFolder = async (id) => {
    const { data } = await api.delete(`/folders/${id}`)
    return data
}

export const getFolderEntities = async (id) => {
    const { data } = await api.get(`/folders/${id}/entities`)
    return data
}

// ============================================
// Entity API
// ============================================
export const getEntities = async (type = null) => {
    const params = type ? { type } : {}
    const { data } = await api.get('/entities', { params })
    return data
}

export const syncFromTelegram = async () => {
    const { data } = await api.post('/entities/sync-telegram')
    return data
}

export const syncEntities = async (entities) => {
    const { data } = await api.post('/entities/sync', { entities })
    return data
}

// ============================================
// Task API
// ============================================
export const getTasks = async () => {
    const { data } = await api.get('/tasks')
    return data
}

export const getTask = async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}`)
    return data
}

export const scheduleTask = async (taskData) => {
    // If taskData is FormData, let axios handle the Content-Type automatically (boundary)
    const { data } = await api.post('/tasks/schedule', taskData)
    return data
}

export const undoTask = async (taskId) => {
    const res = await api.post(`/tasks/${taskId}/undo`)
    return res.data
}

export const retryTask = async (taskId) => {
    const { data } = await api.post(`/tasks/${taskId}/retry`)
    return data
}

export const clearHistory = async () => {
    const res = await api.delete('/tasks/history')
    return res.data
}

export const updateTaskMetrics = async (taskId) => {
    const { data } = await api.post(`/tasks/${taskId}/update-metrics`)
    return data
}

// ============================================
// Auth API
// ============================================
export const sendAuthCode = async (phoneNumber) => {
    // Ensure phone number is in proper format (with + and no spaces)
    const formattedPhone = phoneNumber.replace(/\s+/g, '').trim();
    const { data } = await api.post('/auth/send-code', { phoneNumber: formattedPhone })
    return data
}

export const signIn = async (signInData) => {
    // Ensure phone number is properly formatted and include all required fields
    const formattedData = {
        phone: signInData.phone?.replace(/\s+/g, '').trim(),
        code: signInData.code?.trim(),
        phone_code_hash: signInData.phone_code_hash
    }
    const { data } = await api.post('/auth/sign-in', formattedData)
    return data
}

export const getAuthStatus = async () => {
    const { data } = await api.get('/auth/status')
    return data
}

// ============================================
// Public Auth API (for phone login - no JWT required)
// ============================================
export const publicSendAuthCode = async (phoneNumber) => {
    // Ensure phone number is in proper format (with + and no spaces)
    const formattedPhone = phoneNumber.replace(/\s+/g, '').trim();
    const { data } = await axios.post('/api/auth/send-code', { phoneNumber: formattedPhone })
    return data
}

export const publicSignIn = async (signInData) => {
    // Ensure phone number is properly formatted and include all required fields
    const formattedData = {
        phone: signInData.phone?.replace(/\s+/g, '').trim(),
        code: signInData.code?.trim(),
        phone_code_hash: signInData.phone_code_hash
    }
    const { data } = await axios.post('/api/auth/sign-in', formattedData)
    return data
}

export const publicGetAuthStatus = async () => {
    const { data } = await axios.get('/api/auth/status')
    return data
}

// ============================================
// Analytics API
// ============================================
export const exportAnalytics = async () => {
    const response = await api.get('/analytics/export', {
        responseType: 'blob'
    })
    return response.data
}

export default api
