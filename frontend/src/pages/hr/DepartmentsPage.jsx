import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, RefreshCw, Briefcase } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';

export const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Department Modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  // Designation Modal
  const [desigModalOpen, setDesigModalOpen] = useState(false);
  const [desigTitle, setDesigTitle] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');
  const [submittingDesig, setSubmittingDesig] = useState(false);

  const { roles } = useAuth();
  const { showToast } = useToast();
  const canManageHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptsData, desigsData] = await Promise.all([
        employeeService.getDepartments(),
        employeeService.getDesignations(),
      ]);
      setDepartments(deptsData || []);
      setDesignations(desigsData || []);
    } catch (err) {
      showToast?.('Failed to load organization structure.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptName) return;
    setSubmittingDept(true);

    try {
      await employeeService.createDepartment({ name: deptName, description: deptDesc });
      showToast?.('Department created successfully!', 'success');
      setDeptModalOpen(false);
      setDeptName('');
      setDeptDesc('');
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to create department.', 'error');
    } finally {
      setSubmittingDept(false);
    }
  };

  const handleCreateDesig = async (e) => {
    e.preventDefault();
    if (!desigTitle || !desigDeptId) return;
    setSubmittingDesig(true);

    try {
      await employeeService.createDesignation({
        title: desigTitle,
        department_id: desigDeptId,
      });
      showToast?.('Designation registered successfully!', 'success');
      setDesigModalOpen(false);
      setDesigTitle('');
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to create designation.', 'error');
    } finally {
      setSubmittingDesig(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Departments & Designations"
        subtitle="Manage club functional departments, job titles, and organizational structure."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Departments' }]}
        actions={
          canManageHR && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDesigTitle('');
                  setDesigDeptId(departments[0]?.id || '');
                  setDesigModalOpen(true);
                }}
                leftIcon={Plus}
              >
                New Designation
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDeptName('');
                  setDeptDesc('');
                  setDeptModalOpen(true);
                }}
                leftIcon={Plus}
              >
                New Department
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments List */}
        <Card title="Club Departments" subtitle="Organizational cost centers" noPadding>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No departments configured.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {departments.map((d) => (
                <div key={d.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{d.name}</p>
                      {d.description && <p className="text-2xs text-slate-500">{d.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Designations List */}
        <Card title="Job Designations" subtitle="Roles and titles mapped to departments" noPadding>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading designations...</div>
          ) : designations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No designations defined.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {designations.map((des) => (
                <div key={des.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{des.title}</p>
                      <p className="text-2xs text-slate-400">{des.department?.name || 'Department'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Create Organization Department"
        subtitle="Define new operational unit (e.g. Operations, Coaching, Cafeteria)"
      >
        <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Facilities & Grounds"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              placeholder="Responsible for court upkeep and lighting."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingDept}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Designation Modal */}
      <Modal
        isOpen={desigModalOpen}
        onClose={() => setDesigModalOpen(false)}
        title="Register Job Designation"
        subtitle="Add job title mapped to an existing department"
      >
        <form onSubmit={handleCreateDesig} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Job Title *</label>
            <input
              type="text"
              value={desigTitle}
              onChange={(e) => setDesigTitle(e.target.value)}
              placeholder="e.g. Senior Badminton Coach"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Department *</label>
            <select
              value={desigDeptId}
              onChange={(e) => setDesigDeptId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDesigModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingDesig}>
              Register Title
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;
