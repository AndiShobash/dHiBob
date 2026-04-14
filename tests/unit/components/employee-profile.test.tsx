import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'user-1', employeeId: 'emp-1', companyId: 'co-1', role: 'ADMIN', email: 'a@b.com', name: 'Alice' },
    },
  }),
}))

vi.mock('@/lib/trpc', () => ({
  trpc: {
    employee: {
      getById: {
        useQuery: vi.fn(),
      },
      update: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
      },
      terminate: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
      },
      updatePersonalInfo: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
      },
      updateWorkInfo: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
      },
      list: {
        useQuery: vi.fn(() => ({ data: { employees: [] } })),
      },
    },
    useContext: () => ({
      employee: {
        getById: { invalidate: vi.fn() },
      },
    }),
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'emp-test-1' }),
  useRouter: () => ({ back: vi.fn() }),
}))

import { trpc } from '@/lib/trpc'
import EmployeeProfilePage from '@/app/(dashboard)/people/[id]/page'

const mockEmployee = {
  id: 'emp-test-1',
  firstName: 'Alice',
  lastName: 'Smith',
  displayName: 'Alice Smith',
  email: 'alice@test.corp',
  status: 'ACTIVE',
  startDate: new Date('2022-01-10'),
  employmentType: 'FULL_TIME',
  companyId: 'co-1',
  department: { id: 'dept-1', name: 'Engineering', companyId: 'co-1' },
  site: { id: 'site-1', name: 'New York', country: 'USA', timezone: 'EST', companyId: 'co-1' },
  manager: {
    id: 'mgr-1',
    firstName: 'Bob',
    lastName: 'Manager',
    displayName: 'Bob Manager',
    email: 'bob.manager@test.corp',
    status: 'ACTIVE',
    startDate: new Date('2020-01-01'),
    employmentType: 'FULL_TIME',
    companyId: 'co-1',
  },
  directReports: [
    { id: 'dr-1', firstName: 'Carol', lastName: 'Report' },
  ],
  company: { id: 'co-1', name: 'Test Corp', domain: 'test.corp', settings: '{}' },
  user: { id: 'user-1', email: 'alice@test.corp', role: 'EMPLOYEE' },
  personalInfo: '{}',
  workInfo: '{}',
  customFields: '{}',
  teamId: null,
  managerId: 'mgr-1',
  departmentId: 'dept-1',
  siteId: 'site-1',
  avatar: null,
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Employee profile page', () => {
  it('renders employee full name', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    const nameElements = screen.getAllByText('Alice Smith')
    expect(nameElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows ACTIVE status badge', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows employee email', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    const emailElements = screen.getAllByText('alice@test.corp')
    expect(emailElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows manager name in Salary tab (Role section)', async () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Salary' }))
    expect(screen.getAllByText(/Bob Manager/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows department name', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    const deptElements = screen.getAllByText(/Engineering/)
    expect(deptElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows loading state', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows not found when error', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Employee not found' },
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })

  it('does not show hardcoded Sarah Chen', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.queryByText('Sarah Chen')).not.toBeInTheDocument()
  })

  // T-01: Profile tab is the default visible tab
  it('Profile tab is the default visible tab', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.getByText('General Info')).toBeInTheDocument()
  })

  // T-02: Profile tab General Info section renders personalInfo fields
  it('Profile tab General Info section renders personalInfo fields', () => {
    const mockEmployeeWithPersonalInfo = {
      ...mockEmployee,
      personalInfo: JSON.stringify({ phone: '555-0100', dateOfBirth: '1990-01-01', gender: 'Female' }),
    }
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployeeWithPersonalInfo,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.getByText('555-0100')).toBeInTheDocument()
    expect(screen.getByText('1990-01-01')).toBeInTheDocument()
    expect(screen.getByText('Female')).toBeInTheDocument()
  })

  // T-03: Salary tab contains Role section and manager name
  it('Salary tab contains Role section and manager name', async () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Salary' }))
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getAllByText(/Bob Manager/).length).toBeGreaterThanOrEqual(1)
  })

  // T-05: Profile tab shows Identification section (merged from Personal)
  it('Profile tab shows Identification section', async () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.getByText('Identification')).toBeInTheDocument()
  })

  // T-06: Profile tab shows Address section (merged from Personal)
  it('Profile tab shows Address section', async () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    const addressElements = screen.getAllByText('Address')
    expect(addressElements.length).toBeGreaterThanOrEqual(1)
  })

  // T-07: Work tab shows Initiation section
  it('Work tab shows Initiation section', async () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    await userEvent.click(screen.getByText('Work'))
    expect(screen.getByText('Initiation')).toBeInTheDocument()
  })

  // T-08: Assets tab renders without crash
  it('Assets tab renders without crash', async () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    await userEvent.click(screen.getByText('Assets'))
    const assetsElements = screen.getAllByText('Assets')
    expect(assetsElements.length).toBeGreaterThanOrEqual(1)
  })

  // T-09: Old tab names no longer present after redesign
  it('Old tab names no longer present after redesign', () => {
    vi.mocked(trpc.employee.getById.useQuery).mockReturnValue({
      data: mockEmployee,
      isLoading: false,
      error: null,
    } as any)
    render(<EmployeeProfilePage params={{ id: 'emp-test-1' }} />)
    expect(screen.queryByText('Employment')).toBeNull()
    expect(screen.queryByText('Additional Data')).toBeNull()
    expect(screen.queryByText('Timeline')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Salary' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Personal' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Client' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'HR talks' })).toBeNull()
  })
})
