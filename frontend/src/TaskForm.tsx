import { useState } from 'react'
import type { FormEvent } from 'react'

type Project = { id: number; name: string }
type Member = { id?: number; name: string }
type Props = { projects: Project[]; assignees: Member[]; onCreated: (task: unknown) => void }

export default function TaskForm({ projects, assignees, onCreated }: Props) {
    const [form, setForm] = useState({ project_id: '', assigned_to: '', title: '', priority: 'medium', status: 'todo', due_date: '' })
    const [error, setError] = useState('')
    const update = (field: string, value: string) => setForm(current => ({ ...current, [field]: value }))
    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        const response = await fetch('/api/tasks', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('focal_token')}` }, body: JSON.stringify({ ...form, project_id: Number(form.project_id), assigned_to: form.assigned_to ? Number(form.assigned_to) : null }) })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) { setError(result.message || 'Unable to create task.'); return }
        onCreated(result)
        setForm({ project_id: '', assigned_to: '', title: '', priority: 'medium', status: 'todo', due_date: '' })
    }
    return <form className="task-form" onSubmit={submit}><select required value={form.project_id} onChange={event => update('project_id', event.target.value)}><option value="">Choose project</option>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select><input required placeholder="Task title" value={form.title} onChange={event => update('title', event.target.value)} /><select value={form.assigned_to} onChange={event => update('assigned_to', event.target.value)}><option value="">Unassigned</option>{assignees.map(member => <option value={member.id} key={member.id}>{member.name}</option>)}</select><select value={form.priority} onChange={event => update('priority', event.target.value)}><option>low</option><option>medium</option><option>high</option></select><select value={form.status} onChange={event => update('status', event.target.value)}><option>todo</option><option>in_progress</option><option>done</option></select><input type="date" value={form.due_date} onChange={event => update('due_date', event.target.value)} /><button className="primary">Create task</button>{error && <small className="error">{error}</small>}</form>
}
