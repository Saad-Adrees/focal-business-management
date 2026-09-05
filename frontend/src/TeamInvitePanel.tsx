import { useState } from 'react'
import type { FormEvent } from 'react'

export default function TeamInvitePanel() {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'manager' | 'employee'>('employee')
    const [message, setMessage] = useState('')

    const invite = async (event: FormEvent) => {
        event.preventDefault()
        const response = await fetch('/api/team/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('focal_token')}` },
            body: JSON.stringify({ email, role }),
        })
        const result = await response.json().catch(() => ({}))
        setMessage(response.ok ? `Invitation token: ${result.token}` : result.message || 'Unable to create invitation.')
        if (response.ok) setEmail('')
    }

    return <section className="panel invite-panel"><div className="panel-head"><div><p className="eyebrow">TEAM INVITATION</p><h2>Invite a teammate</h2></div></div><form className="invite-form" onSubmit={invite}><input required type="email" placeholder="teammate@example.com" value={email} onChange={event => setEmail(event.target.value)} /><select value={role} onChange={event => setRole(event.target.value as 'manager' | 'employee')}><option value="employee">Employee</option><option value="manager">Manager</option></select><button className="primary">Create invite</button></form>{message && <p className="form-message invite-message">{message}</p>}</section>
}
