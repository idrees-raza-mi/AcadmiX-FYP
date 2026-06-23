import { useEffect, useState } from 'react'
import {
  CheckSquare, Square, ToggleLeft, ToggleRight, Save,
  Clock, BookOpen, Fingerprint, GraduationCap, Calendar, ClipboardList,
} from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '18px 22px', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: 'var(--gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} style={{ color: 'white' }} />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: checked ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center',
      }}
    >
      {checked
        ? <ToggleRight size={28} />
        : <ToggleLeft size={28} />
      }
    </button>
  )
}

const DEFAULT_SETTINGS = {
  minAttendance: 75,
  lateGracePeriod: 10,
  excusedCountsAs: 'excused',
  monthlyLeaveQuota: 3,
  lectureDuration: 60,
  classStartTime: '08:00',
  classEndTime: '17:00',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  faceMatchThreshold: 0.5,
  faceCaptureSamples: 5,
  autoStartSessions: true,
  autoCompleteSessions: true,
  attendanceWindowBefore: 10,
  attendanceWindowAfter: 15,
  academicYear: '',
  currentSemester: '',
  gradingScale: { Aplus: 90, A: 80, Bplus: 70, B: 60, C: 50, D: 40 },
}

export default function Settings() {
  const toast = useToast()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/settings')
      .then(r => {
        const s = r.data.data
        if (s) {
          setSettings(prev => ({
            ...prev,
            ...s,
            gradingScale: { ...DEFAULT_SETTINGS.gradingScale, ...(s.gradingScale || {}) },
          }))
        }
      })
      .catch(() => toast('Failed to load settings', 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }))
  const setGrade = (key, val) => setSettings(prev => ({
    ...prev,
    gradingScale: { ...prev.gradingScale, [key]: val },
  }))

  const toggleDay = (day) => {
    const days = settings.workingDays.includes(day)
      ? settings.workingDays.filter(d => d !== day)
      : [...settings.workingDays, day]
    set('workingDays', days)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/settings', settings)
      toast('Settings saved successfully', 'success')
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="table-loading" style={{ paddingTop: 80 }}><div className="spinner" /></div>

  const numInput = (key, min, max, step = 1) => (
    <input
      className="form-input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={settings[key] ?? ''}
      onChange={e => set(key, e.target.value === '' ? '' : Number(e.target.value))}
    />
  )

  return (
    <div className="page">
      {/* Save button row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Attendance Settings */}
      <Section title="Attendance Settings" icon={ClipboardList}>
        <Field label="Minimum attendance threshold" hint="Students below this % will be flagged">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {numInput('minAttendance', 0, 100)}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>%</span>
          </div>
        </Field>
        <Field label="Late grace period" hint="Minutes after class starts before marking late">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {numInput('lateGracePeriod', 0, 60)}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>min</span>
          </div>
        </Field>
        <Field label="Excused absence counts as">
          <select className="form-select" value={settings.excusedCountsAs} onChange={e => set('excusedCountsAs', e.target.value)}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused (separate)</option>
          </select>
        </Field>
      </Section>

      {/* Leave Settings */}
      <Section title="Leave Settings" icon={Calendar}>
        <Field label="Monthly leave quota" hint="Maximum leaves a student can take per month">
          {numInput('monthlyLeaveQuota', 0, 30)}
        </Field>
      </Section>

      {/* Lecture / Timetable Settings */}
      <Section title="Lecture / Timetable Settings" icon={Clock}>
        <Field label="Default lecture duration" hint="Used to auto-generate timetable slots">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {numInput('lectureDuration', 15, 180, 5)}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>min</span>
          </div>
        </Field>
        <Field label="Class start time">
          <input className="form-input" type="time" value={settings.classStartTime} onChange={e => set('classStartTime', e.target.value)} />
        </Field>
        <Field label="Class end time">
          <input className="form-input" type="time" value={settings.classEndTime} onChange={e => set('classEndTime', e.target.value)} />
        </Field>
        <Field label="Working days">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WORKING_DAYS.map(day => {
              const checked = settings.workingDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-full)', background: checked ? '#ecfdf5' : 'white',
                    color: checked ? 'var(--primary-dark)' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {checked ? <CheckSquare size={12} /> : <Square size={12} />}
                  {day.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* Biometric Settings */}
      <Section title="Biometric Settings" icon={Fingerprint}>
        <Field label="Face match threshold" hint="Lower value = stricter matching (0.3–0.7)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range" min={0.3} max={0.7} step={0.05}
              value={settings.faceMatchThreshold}
              onChange={e => set('faceMatchThreshold', parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--primary)' }}
            />
            <span style={{
              fontSize: 13, fontWeight: 700, minWidth: 36,
              color: settings.faceMatchThreshold <= 0.4 ? 'var(--error)' : settings.faceMatchThreshold >= 0.6 ? 'var(--success)' : 'var(--warning)',
            }}>
              {settings.faceMatchThreshold?.toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {settings.faceMatchThreshold <= 0.4 ? 'Strict' : settings.faceMatchThreshold >= 0.6 ? 'Lenient' : 'Balanced'}
          </div>
        </Field>
        <Field label="Face capture samples required" hint="Number of photos taken during enrollment (3–10)">
          {numInput('faceCaptureSamples', 3, 10)}
        </Field>
        <Field label="Auto-start sessions" hint="Automatically start sessions at scheduled time">
          <Toggle checked={!!settings.autoStartSessions} onChange={v => set('autoStartSessions', v)} />
        </Field>
        <Field label="Auto-complete sessions" hint="Automatically end sessions after end time">
          <Toggle checked={!!settings.autoCompleteSessions} onChange={v => set('autoCompleteSessions', v)} />
        </Field>
        <Field label="Attendance window before class" hint="Minutes before class when attendance opens">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {numInput('attendanceWindowBefore', 0, 60)}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>min</span>
          </div>
        </Field>
        <Field label="Attendance window after class" hint="Minutes after class ends when attendance closes">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {numInput('attendanceWindowAfter', 0, 60)}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>min</span>
          </div>
        </Field>
      </Section>

      {/* Academic Settings */}
      <Section title="Academic Settings" icon={BookOpen}>
        <Field label="Academic year" hint="e.g. 2024–2025">
          <input
            className="form-input"
            value={settings.academicYear}
            onChange={e => set('academicYear', e.target.value)}
            placeholder="e.g. 2024-2025"
          />
        </Field>
        <Field label="Current semester">
          <input
            className="form-input"
            value={settings.currentSemester}
            onChange={e => set('currentSemester', e.target.value)}
            placeholder="e.g. Fall 2025"
          />
        </Field>
      </Section>

      {/* Grading Scale */}
      <Section title="Grading Scale" icon={GraduationCap}>
        <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
          Enter the minimum percentage required for each grade. F is assigned when total is below the D threshold.
        </div>
        {[
          ['A+', 'Aplus', '#065F46', '#D1FAE5'],
          ['A', 'A', '#065F46', '#D1FAE5'],
          ['B+', 'Bplus', '#047857', '#d1fae5'],
          ['B', 'B', '#047857', '#d1fae5'],
          ['C', 'C', '#92400E', '#FEF3C7'],
          ['D', 'D', '#9A3412', '#FFEDD5'],
        ].map(([label, key, color, bg]) => (
          <Field
            key={key}
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: bg, color,
                }}>{label}</span>
                Grade
              </span>
            }
            hint={`Minimum % for ${label}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={settings.gradingScale[key] ?? ''}
                onChange={e => setGrade(key, e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>%</span>
            </div>
          </Field>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {[
            { label: 'A+', min: settings.gradingScale.Aplus },
            { label: 'A', min: settings.gradingScale.A },
            { label: 'B+', min: settings.gradingScale.Bplus },
            { label: 'B', min: settings.gradingScale.B },
            { label: 'C', min: settings.gradingScale.C },
            { label: 'D', min: settings.gradingScale.D },
            { label: 'F', min: 0 },
          ].map(g => (
            <div key={g.label} style={{
              background: 'var(--bg)', borderRadius: 8, padding: '6px 12px',
              fontSize: 11, textAlign: 'center',
            }}>
              <div style={{ fontWeight: 700 }}>{g.label}</div>
              <div style={{ color: 'var(--text-secondary)' }}>≥{g.min ?? '?'}%</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Bottom save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
