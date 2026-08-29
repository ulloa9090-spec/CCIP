import { useState } from 'react'
import { Card } from '../common/Card'
import { TextField } from '../common/inputs'
import { useProjectStore } from '../../store/projectStore'

export const SettingsScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const projects = useProjectStore((s) => s.projects)
  const newProject = useProjectStore((s) => s.newProject)
  const selectProject = useProjectStore((s) => s.selectProject)
  const saveProject = useProjectStore((s) => s.saveProject)
  const duplicateProject = useProjectStore((s) => s.duplicateProject)
  const renameProject = useProjectStore((s) => s.renameProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt)

  const [newName, setNewName] = useState('')

  if (!project) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings & Projects</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Each project keeps its own enrollment, tuition, payroll, and expenses. Changes save automatically to this
          browser (IndexedDB); use these controls to manage multiple projects.
        </p>
      </div>

      <Card title="Current Project">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <TextField label="Project Name" value={project.name} onChange={renameProject} />
          </div>
          <button type="button" onClick={() => void saveProject()} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            Save Project
          </button>
          <button type="button" onClick={() => void duplicateProject()} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Duplicate Project
          </button>
          <span className="text-xs text-slate-400">{lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not saved yet'}</span>
        </div>
      </Card>

      <Card title="New Project">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <TextField label="Name" value={newName} onChange={setNewName} />
          </div>
          <button
            type="button"
            onClick={() => {
              void newProject(newName || 'New Childcare Center')
              setNewName('')
            }}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Create
          </button>
        </div>
      </Card>

      <Card title="All Projects">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {projects.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {p.name} {p.id === project.id && <span className="ml-1 text-xs text-indigo-500">(active)</span>}
                </div>
                <div className="text-xs text-slate-400">Updated {new Date(p.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {p.id !== project.id && (
                  <button type="button" onClick={() => void selectProject(p.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    Open
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"? This cannot be undone.`)) void deleteProject(p.id)
                  }}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
