import { useCallback, useEffect, useState } from 'react'
import { useAdminSession } from '../context/AdminSessionContext'
import { getAccessToken } from '../lib/auth-session'
import { ApiError } from '../lib/api-common'
import { useToast } from '../components/toast/useToast'
import {
  createEmployeeAdmin,
  listEmployeesAdmin,
  updateEmployeeAdmin,
  type CreateEmployeeRequest,
  type AdminEmployee,
  type UpdateEmployeeRequest,
} from '../lib/admin-api'
import { CreateEmployeeModal } from '../components/employees/CreateEmployeeModal'
import { UpdateEmployeeModal } from '../components/employees/UpdateEmployeeModal'

type EmployeeFilters = {
  page: number
  limit: number
  role: '' | 'EMPLOYEE' | 'ADMIN_HR'
  search: string
}

type EmployeeDraftFilters = Omit<EmployeeFilters, 'page' | 'limit'>

export function EmployeesPage() {
  const { userRole, refreshBusy } = useAdminSession()
  const accessToken = getAccessToken()

  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    limit: 10,
    role: '',
    search: '',
  })

  const [draftFilters, setDraftFilters] = useState<EmployeeDraftFilters>({
    role: '',
    search: '',
  })

  const [data, setData] = useState<{
    employees: AdminEmployee[]
    page: number
    limit: number
    totalPages: number
    total: number
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Create
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edit
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null)

  const toneFromError = useCallback((err: unknown): 'error500' | 'warning' => {
    const statusCode = err instanceof ApiError ? err.statusCode : undefined
    return statusCode != null && statusCode >= 500 ? 'error500' : 'warning'
  }, [])

  const { pushToast } = useToast()

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await listEmployeesAdmin({
        accessToken,
        page: filters.page,
        limit: filters.limit,
        role: filters.role || undefined,
        search: filters.search || undefined,
      })
      setData({
        employees: res.data,
        page: res.page,
        limit: res.limit,
        totalPages: res.totalPages,
        total: res.total,
      })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load employees')
      pushToast({
        tone: toneFromError(err),
        message: err instanceof Error ? err.message : 'Failed to load employees',
      })
    } finally {
      setLoading(false)
    }
  }, [accessToken, filters.limit, filters.page, filters.role, filters.search, pushToast, toneFromError])

  useEffect(() => {
    void load()
  }, [load])

  const canRender = userRole === 'ADMIN_HR'
  const isBusy = loading || refreshBusy

  const onPageChange = useCallback(
    (nextPage: number) => {
      setFilters((prev) => ({ ...prev, page: nextPage }))
    },
    [setFilters],
  )

  const totalPages = data?.totalPages ?? 1
  const employees = data?.employees ?? []

  const onLimitChange = useCallback(
    (nextLimit: number) => {
      setFilters((prev) => ({ ...prev, limit: nextLimit, page: 1 }))
    },
    [setFilters],
  )

  // Text input: debounce to avoid firing an API request on every character.
  useEffect(() => {
    const nextSearch = draftFilters.search.trim()
    const timeoutId = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === nextSearch) return prev
        return { ...prev, search: nextSearch, page: 1 }
      })
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [draftFilters.search, setFilters])

  const openEdit = useCallback(
    (employee: AdminEmployee) => {
      setEditingEmployee(employee)
      setEditOpen(true)
    },
    [],
  )

  const submitCreate = useCallback(
    async (body: CreateEmployeeRequest) => {
      if (!accessToken) return
      setCreating(true)
      try {
        await createEmployeeAdmin({ accessToken, body })
        setCreateOpen(false)
      pushToast({ tone: 'success', message: 'Employee created' })
        void load()
      } catch (err) {
        pushToast({
          tone: toneFromError(err),
          message: err instanceof Error ? err.message : 'Failed to create employee',
        })
      } finally {
        setCreating(false)
      }
    },
    [accessToken, load, pushToast, toneFromError],
  )

  const submitUpdate = useCallback(
    async (id: string, body: UpdateEmployeeRequest) => {
      if (!accessToken) return
      setEditing(true)
      try {
        await updateEmployeeAdmin({ accessToken, id, body })
        setEditOpen(false)
        setEditingEmployee(null)
      pushToast({ tone: 'success', message: 'Employee updated' })
        void load()
      } catch (err) {
        pushToast({
          tone: toneFromError(err),
          message: err instanceof Error ? err.message : 'Failed to update employee',
        })
      } finally {
        setEditing(false)
      }
    },
    [accessToken, load, pushToast, toneFromError],
  )

  if (!canRender) {
    return (
      <section className="panel">
        <h2>Access denied</h2>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="page-header">
        <h2>Employees</h2>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          Add employee
        </button>
      </div>

      <div className="filters">
        <div className="filter-row">
          <label className="field">
            <span>Role</span>
            <select
              value={draftFilters.role}
              onChange={(e) => {
                const nextRole = e.target.value as EmployeeFilters['role']
                setDraftFilters((prev) => ({ ...prev, role: nextRole }))
                setFilters((prev) => ({ ...prev, role: nextRole, page: 1 }))
              }}
              disabled={isBusy}
            >
              <option value="">All</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="ADMIN_HR">ADMIN_HR</option>
            </select>
          </label>

          <label className="field">
            <span>Search</span>
            <input
              value={draftFilters.search}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="name or email"
              disabled={isBusy}
            />
          </label>
        </div>
      </div>

      <div className="filters-divider" />

      {errorMessage ? <div className="error-text">{errorMessage}</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.email}</td>
                <td>{e.position}</td>
                <td>{e.role}</td>
                <td>{e.phoneNumber ?? '-'}</td>
                <td>{e.isActive ? 'Active' : 'Inactive'}</td>
                <td className="table-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => openEdit(e)} disabled={isBusy}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && !loading ? (
              <tr>
                <td colSpan={7}>No employees found</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-bar">
          <div className="pagination-left">
            <label className="limit-control">
              <span>Limit</span>
              <select
                value={filters.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                disabled={isBusy}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="pagination-meta">Page {filters.page} / {totalPages}</div>

          <div className="pagination-right">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isBusy || filters.page <= 1}
              onClick={() => onPageChange(filters.page - 1)}
            >
              Prev
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={isBusy || filters.page >= totalPages}
              onClick={() => onPageChange(filters.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {createOpen ? (
        <CreateEmployeeModal
          open={createOpen}
          creating={creating}
          onCancel={() => setCreateOpen(false)}
          onCreate={(body) => void submitCreate(body)}
        />
      ) : null}

      {editOpen && editingEmployee ? (
        <UpdateEmployeeModal
          key={editingEmployee.id}
          open={editOpen}
          employee={editingEmployee}
          editing={editing}
          onCancel={() => {
            setEditOpen(false)
            setEditingEmployee(null)
          }}
          onUpdate={(id, body) => void submitUpdate(id, body)}
        />
      ) : null}
    </section>
  )
}

