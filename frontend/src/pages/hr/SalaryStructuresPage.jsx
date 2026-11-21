import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, RefreshCw, UserCheck, Shield, FileSpreadsheet, Percent, Layers } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import payrollService from '../../services/payrollService';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const SalaryStructuresPage = () => {
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Structure Modal
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);
  const [structName, setStructName] = useState('');
  const [structDesc, setStructDesc] = useState('');
  const [submittingStruct, setSubmittingStruct] = useState(false);
  const [structError, setStructError] = useState('');

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedStructId, setSelectedStructId] = useState('');
  const [baseSalary, setBaseSalary] = useState('35000.00');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState('');

  const { roles } = useAuth();
  const { showToast } = useToast();
  const canManageHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [structsData, empsData] = await Promise.all([
        payrollService.getSalaryStructures(),
        employeeService.getEmployees({ employment_status: 'active' }),
      ]);
      setStructures(structsData || []);
      setEmployees(empsData || []);
      if (structsData?.length > 0 && !selectedStructId) {
        setSelectedStructId(structsData[0].id);
      }
      if (empsData?.length > 0 && !selectedEmpId) {
        setSelectedEmpId(empsData[0].id);
      }
    } catch (err) {
      showToast?.('Failed to load salary structures.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedStructId, selectedEmpId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    if (!structName) return;
    setSubmittingStruct(true);
    setStructError('');

    try {
      // Backend SalaryStructureCreate schema:
      // { name, description?, components: List[SalaryComponentCreate] }
      // SalaryComponentCreate: { component_name, component_type: 'earning' | 'deduction', default_amount }
      await payrollService.createSalaryStructure({
        name: structName,
        description: structDesc || undefined,
        components: [
          {
            component_name: 'Basic Pay',
            component_type: 'earning',
            default_amount: '0.00',
          },
          {
            component_name: 'House Rent Allowance (HRA)',
            component_type: 'earning',
            default_amount: '0.00',
          },
          {
            component_name: 'Special Allowance',
            component_type: 'earning',
            default_amount: '0.00',
          },
          {
            component_name: 'Provident Fund (PF)',
            component_type: 'deduction',
            default_amount: '0.00',
          },
          {
            component_name: 'Professional Tax (PT)',
            component_type: 'deduction',
            default_amount: '0.00',
          },
        ],
      });
      showToast?.('Salary structure and standard compensation components published!', 'success');
      setIsStructModalOpen(false);
      setStructName('');
      setStructDesc('');
      loadData();
    } catch (err) {
      setStructError(err.response?.data?.detail || err.message || 'Failed to create salary structure.');
    } finally {
      setSubmittingStruct(false);
    }
  };

  const handleAssignSalary = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedStructId) {
      setAssignError('Please select both an employee and a salary structure.');
      return;
    }
    setSubmittingAssign(true);
    setAssignError('');

    try {
      // Backend SalaryAssignmentCreate: { salary_structure_id, base_salary, effective_from }
      await payrollService.assignSalary(selectedEmpId, {
        salary_structure_id: selectedStructId,
        base_salary: baseSalary,
        effective_from: effectiveFrom,
      });
      showToast?.('Employee compensation structure assigned successfully!', 'success');
      setIsAssignModalOpen(false);
      loadData();
    } catch (err) {
      setAssignError(err.response?.data?.detail || err.message || 'Failed to assign salary.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Salary Structures & Compensation"
        subtitle="Earnings and deductions templates, monthly CTC definitions, and employee structure assignments."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Salary Structures' }]}
        actions={
          canManageHR && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignError('');
                  setIsAssignModalOpen(true);
                }}
                leftIcon={UserCheck}
              >
                Assign to Employee
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStructError('');
                  setIsStructModalOpen(true);
                }}
                leftIcon={Plus}
              >
                New Structure Template
              </Button>
            </div>
          )
        }
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>Pre-configured structures standardize base compensation, statutory PF, and allowances for payroll calculation.</p>
        <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading compensation templates...</div>
      ) : structures.length === 0 ? (
        <Card className="text-center py-12 text-slate-500 text-xs">
          <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>No salary structures defined yet.</p>
          {canManageHR && (
            <Button variant="primary" size="sm" className="mt-4" onClick={() => setIsStructModalOpen(true)}>
              Create First Template
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {structures.map((s) => (
            <Card key={s.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                      <p className="text-3xs text-slate-400">Created {formatDate(s.created_at)}</p>
                    </div>
                  </div>
                  <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                </div>

                {s.description && (
                  <p className="mt-3 text-xs text-slate-600 line-clamp-2">{s.description}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="font-semibold text-slate-700 text-3xs uppercase tracking-wider block mb-2">
                    Configured Components ({s.components?.length || 0})
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {s.components?.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            c.component_type === 'earning' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          {c.component_name}
                        </span>
                        <span className={`text-3xs font-semibold uppercase px-1.5 py-0.2 rounded ${
                          c.component_type === 'earning' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}>
                          {c.component_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                <span>Statutory Deductions Embedded</span>
                {canManageHR && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStructId(s.id);
                      setIsAssignModalOpen(true);
                    }}
                  >
                    Assign
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Salary Structure Modal */}
      <Modal
        isOpen={isStructModalOpen}
        onClose={() => setIsStructModalOpen(false)}
        title="Create Salary Structure Template"
        subtitle="Defines standardized components for monthly payroll computation"
      >
        <form onSubmit={handleCreateStructure} className="space-y-4 text-xs">
          {structError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {structError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Structure Template Name *</label>
            <input
              type="text"
              value={structName}
              onChange={(e) => setStructName(e.target.value)}
              placeholder="e.g. Standard Full-Time Staff (Grade A)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              value={structDesc}
              onChange={(e) => setStructDesc(e.target.value)}
              placeholder="e.g. Applies to permanent administrative and front-desk personnel"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-slate-600">
            <span className="font-semibold text-slate-800 block mb-1">Standard Default Components:</span>
            <p className="flex items-center gap-1.5 text-2xs text-emerald-700 font-medium">
              ✓ Basic Pay (Earning)
            </p>
            <p className="flex items-center gap-1.5 text-2xs text-emerald-700 font-medium">
              ✓ House Rent Allowance - HRA (Earning)
            </p>
            <p className="flex items-center gap-1.5 text-2xs text-emerald-700 font-medium">
              ✓ Special Allowance (Earning)
            </p>
            <p className="flex items-center gap-1.5 text-2xs text-rose-700 font-medium">
              ✓ Employee Provident Fund - PF (Deduction)
            </p>
            <p className="flex items-center gap-1.5 text-2xs text-rose-700 font-medium">
              ✓ Professional Tax - PT (Deduction)
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsStructModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingStruct}>
              Publish Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Structure Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Salary to Employee"
        subtitle="Attach compensation structure and establish monthly gross CTC"
      >
        <form onSubmit={handleAssignSalary} className="space-y-4 text-xs">
          {assignError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {assignError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Employee *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code} • {emp.designation?.title || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Salary Structure *</label>
            <select
              value={selectedStructId}
              onChange={(e) => setSelectedStructId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.components?.length || 0} components)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Monthly Base Salary (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Effective Date *</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingAssign}>
              Confirm Salary Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SalaryStructuresPage;
