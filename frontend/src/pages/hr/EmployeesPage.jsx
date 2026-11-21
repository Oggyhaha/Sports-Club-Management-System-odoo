import React, { useState, useEffect, useCallback } from 'react';
import { UserCog, UserPlus, RefreshCw, Filter, Shield } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active Staff' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
];

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [employeeToUpdate, setEmployeeToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('active');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { roles } = useAuth();
  const { showToast } = useToast();
  const canManageHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.employment_status = statusFilter;

      const [empsData, deptsData, desigsData] = await Promise.all([
        employeeService.getEmployees(params),
        employeeService.getDepartments(),
        employeeService.getDesignations(),
      ]);
      setEmployees(empsData || []);
      setDepartments(deptsData || []);
      setDesignations(desigsData || []);
    } catch (err) {
      showToast?.('Failed to load employee workforce directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!empCode || !firstName || !lastName || !email) {
      setErrorMsg('Employee code, first name, last name, and email are required.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      await employeeService.createEmployee({
        employee_code: empCode.toUpperCase().trim(),
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        department_id: deptId || null,
        designation_id: desigId || null,
        date_of_joining: dateOfJoining,
        employment_status: 'active',
      });
      showToast?.('Employee profile created successfully!', 'success');
      setIsModalOpen(false);
      setEmpCode('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create employee profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!employeeToUpdate) return;
    setUpdatingStatus(true);

    try {
      await employeeService.updateEmployeeStatus(employeeToUpdate.id, newStatus);
      showToast?.(`Employment status updated for ${employeeToUpdate.first_name}!`, 'success');
      setStatusModalOpen(false);
      setEmployeeToUpdate(null);
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to update status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Employee Workforce Management"
        subtitle="Staff roster, departmental allocations, job designations, and employment lifecycle status."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Employees' }]}
        actions={
          canManageHR && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEmpCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
                setDeptId(departments[0]?.id || '');
                setDesigId(designations[0]?.id || '');
                setIsModalOpen(true);
              }}
              leftIcon={UserPlus}
            >
              Add Employee
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-slate-600">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
          >
            <option value="">All Employment Statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {/* Employee Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading employee roster...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No employees registered in directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Employee Name</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Designation</th>
                  <th className="py-2.5 px-4">Joined Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 text-2xs">
                      {emp.employee_code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-3xs text-slate-400">{emp.email}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.department?.name || 'Operations'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.designation?.title || 'Staff'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatDate(emp.date_of_joining)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={emp.employment_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManageHR && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmployeeToUpdate(emp);
                            setNewStatus(emp.employment_status);
                            setStatusModalOpen(true);
                          }}
                        >
                          Change Status
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Employee Profile"
        subtitle="Onboard staff member with department and designation mapping"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Employee Code *</label>
              <input
                type="text"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                placeholder="EMP-101"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Suresh"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Kumar"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="suresh@championsclub.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Department</label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Designation</label>
              <select
                value={desigId}
                onChange={(e) => setDesigId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              >
                <option value="">-- Select Designation --</option>
                {designations.map((des) => (
                  <option key={des.id} value={des.id}>
                    {des.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Date of Joining *</label>
            <input
              type="date"
              value={dateOfJoining}
              onChange={(e) => setDateOfJoining(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Create Employee Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Employment Status"
        subtitle={`Employee: ${employeeToUpdate?.first_name} ${employeeToUpdate?.last_name}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Employment Status *</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 leading-relaxed">
            <p className="font-semibold">Relational Integrity Notice</p>
            <p className="mt-0.5 text-2xs text-amber-800">
              Hard deletion is restricted to preserve historical attendance, leave logs, and finalized payslip records.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={updatingStatus}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
