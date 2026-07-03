import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';

function App() {
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

    // Integration States
    const [activePanel, setActivePanel] = useState(null); // 'clickup' | 'linear' | null
    const [clickupListId, setClickupListId] = useState('');
    const [linearTeamId, setLinearTeamId] = useState('');
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        Promise.all([
            axios.get(`${API_URL}/api/tasks`),
            axios.get(`${API_URL}/api/categories`)
        ]).then(([tasksRes, catsRes]) => {
            setTasks(tasksRes.data);
            setCategories(catsRes.data);
            setLoading(false);
        }).catch(err => console.error("Error loading application state:", err));
    }, []);

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        axios.post(`${API_URL}/api/categories`, { name: newCategoryName })
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

        axios.post(`${API_URL}/api/tasks`, payload)
            .then(res => {
                setTasks([res.data, ...tasks]);
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskCatId('');
            })
            .catch(err => console.error("Error creating task:", err));
    };

    const handleToggleTask = (task) => {
        axios.put(`${API_URL}/api/tasks/${task.id}`, { is_completed: !task.is_completed })
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

        axios.put(`${API_URL}/api/tasks/${id}`, payload)
            .then(res => {
                setTasks(tasks.map(t => t.id === id ? res.data : t));
                setEditingTaskId(null);
            })
            .catch(err => console.error("Error saving edits:", err));
    };

    const handleDeleteTask = (id) => {
        axios.delete(`${API_URL}/api/tasks/${id}`)
            .then(() => setTasks(tasks.filter(t => t.id !== id)))
            .catch(err => console.error("Error destroying task records:", err));
    };

    // Integration Sync Handlers
    const handleClickUpSync = (type) => {
        if (!clickupListId.trim()) return alert("Please enter a ClickUp List ID first!");
        setSyncing(true);

        const endpoint = type === 'import' ? 'import' : 'export';
        const payload = { clickup_list_id: clickupListId };

        axios.post(`${API_URL}/api/integration/clickup/${endpoint}`, payload)
            .then(res => {
                alert(type === 'import'
                    ? `Imported ${res.data.imported} items successfully!`
                    : `Exported ${res.data.exported} tasks cleanly!`
                );
                if (type === 'import' && res.data.imported > 0) {
                    axios.get(`${API_URL}/api/tasks`).then(r => setTasks(r.data));
                }
            })
            .catch(() => alert(`ClickUp ${endpoint} failed`))
            .finally(() => setSyncing(false));
    };

    const handleLinearSync = (type) => {
        if (!linearTeamId.trim()) return alert("Please enter a Linear Team ID first!");
        setSyncing(true);

        const endpoint = type === 'import' ? 'import' : 'export';
        const payload = { linear_team_id: linearTeamId };

        axios.post(`${API_URL}/api/integration/linear/${endpoint}`, payload)
            .then(res => {
                alert(type === 'import'
                    ? `Imported ${res.data.imported} items successfully!`
                    : `Exported ${res.data.exported} tasks cleanly!`
                );
                if (type === 'import' && res.data.imported > 0) {
                    axios.get(`${API_URL}/api/tasks`).then(r => setTasks(r.data));
                }
            })
            .catch(() => alert(`Linear ${endpoint} failed`))
            .finally(() => setSyncing(false));
    };

    const filteredTasks = tasks.filter(task => {
        if (selectedCategoryFilter === 'all') return true;
        return String(task.category_id) === String(selectedCategoryFilter);
    });

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '700px', margin: 'auto' }}>
            <h1 style={{ color: '#4F46E5', textAlign: 'center', marginBottom: '30px' }}>Task Planner Board</h1>

            {/* INTEGRATION PANEL COMPONENT */}
            <div style={{ background: '#F3F4F6', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #E5E7EB' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1F2937', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    External Third-Party Integrations
                </h3>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                        onClick={() => setActivePanel(activePanel === 'clickup' ? null : 'clickup')}
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
                        onClick={() => setActivePanel(activePanel === 'linear' ? null : 'linear')}
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

                {/* DYNAMIC POP-DOWN DRAWER CONTROLS */}
                {activePanel && (
                    <div style={{ marginTop: '20px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activePanel === 'clickup' ? (
                            <>
                                <h4 style={{ margin: '0 0 5px 0', color: '#7B61FF' }}>Configure ClickUp Sync</h4>
                                <input
                                    type="text"
                                    placeholder="Enter ClickUp List ID (e.g., 901219246639)"
                                    value={clickupListId}
                                    onChange={(e) => setClickupListId(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                                    disabled={syncing}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleClickUpSync('import')}
                                        disabled={syncing}
                                        style={{ background: '#7B61FF', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1 }}
                                    >
                                        {syncing ? 'Processing...' : 'Import Tasks'}
                                    </button>
                                    <button
                                        onClick={() => handleClickUpSync('export')}
                                        disabled={syncing}
                                        style={{ background: '#4B5563', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1 }}
                                    >
                                        {syncing ? 'Processing...' : 'Export All'}
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
                                    onChange={(e) => setLinearTeamId(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                                    disabled={syncing}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleLinearSync('import')}
                                        disabled={syncing}
                                        style={{ background: '#5E6AD2', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1 }}
                                    >
                                        {syncing ? 'Processing...' : 'Import Tasks'}
                                    </button>
                                    <button
                                        onClick={() => handleLinearSync('export')}
                                        disabled={syncing}
                                        style={{ background: '#4B5563', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, opacity: syncing ? 0.7 : 1 }}
                                    >
                                        {syncing ? 'Processing...' : 'Export All'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* TASK AND CATEGORY FORMS */}
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

            {/* LIST FILTER AND DISPLAY */}
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