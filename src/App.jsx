import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';

function App() {
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(true);

    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    // FETCH ALL TASKS (Read)
    useEffect(() => {
        axios.get(`${API_URL}/api/tasks`)
            .then(res => {
                setTasks(res.data);
                setLoading(false);
            })
            .catch(err => console.error("Error fetching tasks:", err));
    }, []);


    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        axios.post(`${API_URL}/api/tasks`, { title: newTaskTitle })
            .then(res => {
                setTasks([res.data, ...tasks]);
                setNewTaskTitle('');
            })
            .catch(err => console.error("Error adding task:", err));
    };


    const handleToggleTask = (id) => {
        axios.put(`${API_URL}/api/tasks/${id}`)
            .then(res => {
                setTasks(tasks.map(t => t.id === id ? res.data : t));
            })
            .catch(err => console.error("Error updating task:", err));
    };

    const startEdit = (task) => {
        setEditingTaskId(task.id);
        setEditingTitle(task.title);
    };


    const handleSaveEdit = (id) => {
        if (!editingTitle.trim()) return;

        axios.put(`${API_URL}/api/tasks/${id}`, { title: editingTitle })
            .then(res => {
                setTasks(tasks.map(t => t.id === id ? res.data : t));
                setEditingTaskId(null); // Close editing input template
                setEditingTitle('');
            })
            .catch(err => console.error("Error saving task title:", err));
    };


    const handleDeleteTask = (id) => {
        axios.delete(`${API_URL}/api/tasks/${id}`)
            .then(() => {
                setTasks(tasks.filter(t => t.id !== id));
            })
            .catch(err => console.error("Error deleting task:", err));
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '550px', margin: 'auto' }}>
            <h1 style={{ color: '#4F46E5', textAlign: 'center' }}>Task Planner</h1>

            {/* Create Form */}
            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="What needs to be done?"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '16px' }}
                />
                <button type="submit" style={{ background: '#4F46E5', color: 'white', border: '0', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Add
                </button>
            </form>

            {/* Task List Container */}
            {loading ? <p>Loading tasks...</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {tasks.map(task => (
                        <li key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #E5E7EB', background: task.is_completed ? '#F9FAFB' : 'white' }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <input
                                    type="checkbox"
                                    checked={task.is_completed}
                                    onChange={() => handleToggleTask(task.id)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />

                                {editingTaskId === task.id ? (
                                    <input
                                        type="text"
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #4F46E5', fontSize: '16px', width: '70%' }}
                                    />
                                ) : (
                                    <span style={{ textDecoration: task.is_completed ? 'line-through' : 'none', color: task.is_completed ? '#9CA3AF' : '#111827', fontSize: '16px' }}>
                    {task.title}
                  </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {editingTaskId === task.id ? (
                                    <>
                                        <button onClick={() => handleSaveEdit(task.id)} style={{ background: '#10B981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                                            Save
                                        </button>
                                        <button onClick={() => setEditingTaskId(null)} style={{ background: '#9CA3AF', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(task)} style={{ background: 'transparent', color: '#4F46E5', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>

                        </li>
                    ))}
                    {tasks.length === 0 && <p style={{ color: '#6B7280', textAlign: 'center', marginTop: '20px' }}>No tasks found. Add your first one above!</p>}
                </ul>
            )}
        </div>
    );
}

export default App;
