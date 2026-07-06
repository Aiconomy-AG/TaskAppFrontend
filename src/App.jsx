import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(''); // Added email state
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [authError, setAuthError] = useState('');

    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskCatId, setNewTaskCatId] = useState('');

    const [newCategoryName, setNewCategoryName] = useState('');

    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingDesc, setEditingDesc] = useState('');
    const [editingCatId, setEditingCatId] = useState('');

    const [activePanel, setActivePanel] = useState(null);
    const [clickupListId, setClickupListId] = useState('');
    const [linearTeamId, setLinearTeamId] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState({ message: '', isError: false });

    const getAuthConfig = () => {
        return {
            headers: { Authorization: `Bearer ${token}` }
        };
    };

    useEffect(() => {
        if (!token) return;

        setLoading(true);
        Promise.all([
            axios.get(`${API_URL}/api/tasks`, getAuthConfig()),
            axios.get(`${API_URL}/api/categories`, getAuthConfig()),
            axios.get(`${API_URL}/api/user`, getAuthConfig())
        ]).then(([tasksRes, catsRes, userRes]) => {
            setTasks(tasksRes.data);
            setCategories(catsRes.data);
            setLoggedInUser(userRes.data);
            setLoading(false);
        }).catch(err => {
            console.error("Error loading application state:", err);
            if (err.response?.status === 401) {
                handleLogout();
            }
        });
    }, [token]);

    const handleAuth = (e) => {
        e.preventDefault();
        setAuthError('');
        if (!username.trim() || !password.trim()) return;
        if (isRegistering && !email.trim()) return; // Ensure email is filled out when registering

        const endpoint = isRegistering ? '/api/register' : '/api/login';

        // Include email in the registration payload
        const payload = isRegistering
            ? { username, email, password }
            : { username, password };

        axios.post(`${API_URL}${endpoint}`, payload)
            .then(res => {
                const receivedToken = res.data.token || res.data.access_token;
                if (receivedToken) {
                    localStorage.setItem('token', receivedToken);
                    setToken(receivedToken);
                    setUsername('');
                    setEmail('');
                    setPassword('');
                } else if (isRegistering) {
                    setIsRegistering(false);
                    setAuthError('Registration successful! Please log in.');
                    setEmail('');
                    setPassword('');
                }
            })
            .catch(err => {
                setAuthError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
                console.error("Auth error:", err);
            });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken('');
        setLoggedInUser(null);
        setTasks([]);
        setCategories([]);

        setIsRegistering(false);
        setAuthError('');
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        axios.post(`${API_URL}/api/categories`, { name: newCategoryName }, getAuthConfig())
            .then(res => {
                setCategories([...categories, res.data]);
                setNewCategoryName('');
            })
            .catch(err => console.error("Error creating category:", err));
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const payload = {
            title: newTaskTitle,
            description: newTaskDesc,
            category_id: newTaskCatId || null
        };

        axios.post(`${API_URL}/api/tasks`, payload, getAuthConfig())
            .then(res => {
                setTasks([res.data, ...tasks]);
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskCatId('');
            })
            .catch(err => console.error("Error creating task:", err));
    };

    const handleToggleTask = (task) => {
        axios.put(`${API_URL}/api/tasks/${task.id}`, { is_completed: !task.is_completed }, getAuthConfig())
            .then(res => {
                setTasks(tasks.map(t => t.id === task.id ? res.data : t));
            })
            .catch(err => console.error("Error updating status:", err));
    };

    const startEdit = (task) => {
        setEditingTaskId(task.id);
        setEditingTitle(task.title);
        setEditingDesc(task.description || '');
        setEditingCatId(task.category_id || '');
    };

    const handleSaveEdit = (id) => {
        if (!editingTitle.trim()) return;

        const payload = {
            title: editingTitle,
            description: editingDesc,
            category_id: editingCatId || null
        };

        axios.put(`${API_URL}/api/tasks/${id}`, payload, getAuthConfig())
            .then(res => {
                setTasks(tasks.map(t => t.id === id ? res.data : t));
                setEditingTaskId(null);
            })
            .catch(err => console.error("Error saving edits:", err));
    };

    const handleDeleteTask = (id) => {
        axios.delete(`${API_URL}/api/tasks/${id}`, getAuthConfig())
            .then(() => setTasks(tasks.filter(t => t.id !== id)))
            .catch(err => console.error("Error destroying task records:", err));
    };

    const handleClickUpSync = (type) => {
        if (!clickupListId.trim()) {
            setSyncStatus({ message: "Please enter a ClickUp List ID first!", isError: true });
            return;
        }
        setSyncing(true);
        setSyncStatus({ message: "Processing sync... please wait.", isError: false });

        const endpoint = type === 'import' ? 'import' : 'export';
        const payload = { clickup_list_id: clickupListId };

        axios.post(`${API_URL}/api/integration/clickup/${endpoint}`, payload, getAuthConfig())
            .then(res => {
                const count = type === 'import' ? res.data.imported : res.data.exported;
                const actionVerb = type === 'import' ? 'imported' : 'exported';

                setSyncStatus({
                    message: `All ${count ?? 0} tasks ${actionVerb} successfully!`,
                    isError: false
                });

                if (type === 'import' && res.data.imported > 0) {
                    axios.get(`${API_URL}/api/tasks`, getAuthConfig()).then(r => setTasks(r.data));
                }
            })
            .catch(() => setSyncStatus({ message: `ClickUp ${endpoint} failed`, isError: true }))
            .finally(() => setSyncing(false));
    };

    const handleLinearSync = (type) => {
        if (!linearTeamId.trim()) {
            setSyncStatus({ message: "Please enter a Linear Team ID first!", isError: true });
            return;
        }
        setSyncing(true);
        setSyncStatus({ message: "Processing sync... please wait.", isError: false });

        const endpoint = type === 'import' ? 'import' : 'export';
        const payload = { linear_team_id: linearTeamId };

        axios.post(`${API_URL}/api/integration/linear/${endpoint}`, payload, getAuthConfig())
            .then(res => {
                const count = type === 'import' ? res.data.imported : res.data.exported;
                const actionVerb = type === 'import' ? 'imported' : 'exported';

                setSyncStatus({
                    message: `All ${count ?? 0} tasks ${actionVerb} successfully!`,
                    isError: false
                });

                if (type === 'import' && res.data.imported > 0) {
                    axios.get(`${API_URL}/api/tasks`, getAuthConfig()).then(r => setTasks(r.data));
                }
            })
            .catch(() => setSyncStatus({ message: `Linear ${endpoint} failed`, isError: true }))
            .finally(() => setSyncing(false));
    };

    const filteredTasks = tasks.filter(task => {
        if (selectedCategoryFilter === 'all') return true;
        return String(task.category_id) === String(selectedCategoryFilter);
    });

    if (!token) {
        return (
            <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '100px auto', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h2 style={{ color: '#4F46E5', textAlign: 'center', marginBottom: '20px' }}>
                    {isRegistering ? 'Create an Account' : 'Sign In to Board'}
                </h2>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                            required
                        />
                    </div>

                    {/* ONLY RENDER THE EMAIL FIELD IF THE USER CLICKS 'SIGN UP' */}
                    {isRegistering && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                                required
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                            required
                        />
                    </div>

                    {authError && (
                        <p style={{ color: '#EF4444', fontSize: '14px', margin: '0', textAlign: 'center', fontWeight: 'bold' }}>
                            {authError}
                        </p>
                    )}

                    <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '5px' }}>
                        {isRegistering ? 'Register' : 'Login'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B7280', marginTop: '20px' }}>
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <span
                        onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                        style={{ color: '#4F46E5', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                        {isRegistering ? 'Sign In' : 'Sign Up'}
                    </span>
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '700px', margin: 'auto' }}>
            <style>
                {`
                    @keyframes rotation {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .loader {
                        --color-1: #B677E2;
                        --size: 0.5px;
                        width: calc(48 * var(--size));
                        height: calc(48 * var(--size));
                        border: calc(5 * var(--size)) solid var(--color-1);
                        border-bottom-color: transparent;
                        border-radius: 50%;
                        display: inline-block;
                        box-sizing: border-box;
                        animation: rotation 1s linear infinite;
                    }
                `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>
                    {loggedInUser ? (
                        <>You are logged in with user: <strong style={{ color: '#111827' }}>{loggedInUser.name}</strong></>
                    ) : (
                        "Loading session profiles..."
                    )}
                </span>
                <button
                    onClick={handleLogout}
                    style={{ background: '#EF4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                    Logout
                </button>
            </div>

            <h1 style={{ color: '#4F46E5', textAlign: 'center', marginBottom: '30px' }}>Task Planner Board</h1>

            <div style={{ background: '#F3F4F6', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #E5E7EB' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1F2937', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    External Third-Party Integrations
                </h3>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                        onClick={() => {
                            setActivePanel(activePanel === 'clickup' ? null : 'clickup');
                            setSyncStatus({ message: '', isError: false });
                        }}
                        style={{
                            background: activePanel === 'clickup' ? '#7B61FF' : 'white',
                            color: activePanel === 'clickup' ? 'white' : '#7B61FF',
                            border: '2px solid #7B61FF',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>⚡</span> ClickUp Sync
                    </button>

                    <button
                        onClick={() => {
                            setActivePanel(activePanel === 'linear' ? null : 'linear');
                            setSyncStatus({ message: '', isError: false });
                        }}
                        style={{
                            background: activePanel === 'linear' ? '#5E6AD2' : 'white',
                            color: activePanel === 'linear' ? 'white' : '#5E6AD2',
                            border: '2px solid #5E6AD2',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>⧉</span> Linear Sync
                    </button>
                </div>

                {activePanel && (
                    <div style={{ marginTop: '20px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activePanel === 'clickup' ? (
                            <>
                                <h4 style={{ margin: '0 0 5px 0', color: '#7B61FF' }}>Configure ClickUp Sync</h4>
                                <input
                                    type="text"
                                    placeholder="Enter ClickUp List ID (e.g., 901219246639)"
                                    value={clickupListId}
                                    onChange={(e) => {
                                        setClickupListId(e.target.value);
                                        setSyncStatus({ message: '', isError: false });
                                    }}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                                    disabled={syncing}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleClickUpSync('import')}
                                        disabled={syncing}
                                        style={{ background: '#7B61FF', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {syncing ? <><span className="loader" style={{ '--color-1': '#ffffff' }}></span> Syncing...</> : 'Import Tasks'}
                                    </button>
                                    <button
                                        onClick={() => handleClickUpSync('export')}
                                        disabled={syncing}
                                        style={{ background: '#4B5563', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {syncing ? <><span className="loader" style={{ '--color-1': '#ffffff' }}></span> Uploading...</> : 'Export All'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 style={{ margin: '0 0 5px 0', color: '#5E6AD2' }}>Configure Linear Sync</h4>
                                <input
                                    type="text"
                                    placeholder="Enter Linear Team ID Key (e.g., ABC)"
                                    value={linearTeamId}
                                    onChange={(e) => {
                                        setLinearTeamId(e.target.value);
                                        setSyncStatus({ message: '', isError: false });
                                    }}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                                    disabled={syncing}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleLinearSync('import')}
                                        disabled={syncing}
                                        style={{ background: '#5E6AD2', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {syncing ? <><span className="loader" style={{ '--color-1': '#ffffff' }}></span> Syncing...</> : 'Import Tasks'}
                                    </button>
                                    <button
                                        onClick={() => handleLinearSync('export')}
                                        disabled={syncing}
                                        style={{ background: '#4B5563', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {syncing ? <><span className="loader" style={{ '--color-1': '#ffffff' }}></span> Uploading...</> : 'Export All'}
                                    </button>
                                </div>
                            </>
                        )}

                        {syncStatus.message && (
                            <div style={{
                                marginTop: '10px',
                                textAlign: 'center',
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: syncStatus.isError ? '#EF4444' : '#10B981',
                                background: syncStatus.isError ? '#FEF2F2' : '#ECFDF5',
                                border: syncStatus.isError ? '1px solid #FEE2E2' : '1px solid #D1FAE5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}>
                                {!syncStatus.isError && syncing && <span className="loader"></span>}
                                <span>{syncStatus.message}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#F9FAFB', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1F2937' }}>New Task</h3>
                    <input type="text" placeholder="Task Title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }} />
                    <textarea placeholder="Task Description" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB', minHeight: '60px', resize: 'vertical' }} />
                    <select value={newTaskCatId} onChange={(e) => setNewTaskCatId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}>
                        <option value="">Choose List Type (Optional)</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Task</button>
                </form>

                <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#F9FAFB', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB', height: 'fit-content' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1F2937' }}>Add Custom List Type</h3>
                    <input type="text" placeholder="e.g. House, Shopping, Work" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }} />
                    <button type="submit" style={{ background: '#10B981', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create List Category</button>
                </form>
            </div>

            <div style={{ background: '#F3F4F6', padding: '15px', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: '#374151' }}>Viewing List Type: </label>
                <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '15px', background: 'white' }}
                >
                    <option value="all">All Combined Lists</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {loading ? <p>Loading application schemas...</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {filteredTasks.map(task => {
                        const currentCat = categories.find(c => String(c.id) === String(task.category_id));

                        return (
                            <li key={task.id} style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', background: task.is_completed ? '#F9FAFB' : 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {editingTaskId === task.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                        <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #4F46E5', fontSize: '16px' }} />
                                        <textarea value={editingDesc} onChange={(e) => setEditingDesc(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #4F46E5', fontSize: '14px' }} />
                                        <select value={editingCatId} onChange={(e) => setEditingCatId(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #4F46E5' }}>
                                            <option value="">No Category</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                            <button onClick={() => handleSaveEdit(task.id)} style={{ background: '#10B981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Save Changes</button>
                                            <button onClick={() => setEditingTaskId(null)} style={{ background: '#9CA3AF', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <input type="checkbox" checked={task.is_completed} onChange={() => handleToggleTask(task)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                <div>
                                                    <span style={{ textDecoration: task.is_completed ? 'line-through' : 'none', color: task.is_completed ? '#9CA3AF' : '#111827', fontSize: '18px', fontWeight: 'bold' }}>
                                                        {task.title}
                                                    </span>
                                                    {currentCat && (
                                                        <span style={{ marginLeft: '10px', background: '#EEF2FF', color: '#4F46E5', fontSize: '12px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                                                            {currentCat.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <button onClick={() => startEdit(task)} style={{ background: 'transparent', color: '#4F46E5', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Edit</button>
                                                <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Delete</button>
                                            </div>
                                        </div>
                                        {task.description && (
                                            <p style={{ margin: '0 0 0 30px', color: '#4B5563', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.4' }}>
                                                {task.description}
                                            </p>
                                        )}
                                    </>
                                )}
                            </li>
                        );
                    })}
                    {filteredTasks.length === 0 && (
                        <p style={{ color: '#6B7280', textAlign: 'center', marginTop: '30px' }}>No items trackable inside this viewing layout context yet!</p>
                    )}
                </ul>
            )}
        </div>
    );
}

export default App;