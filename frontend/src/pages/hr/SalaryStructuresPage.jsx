import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, RefreshCw, UserCheck, Shield } from 'lucide-react';
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
  const [basicRate, setBasicRate] = useState('50.0'); // 50%
  const [hraRate, setHraRate] = useState('20.0'); // 20%
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
    } catch (err) {
      showToast?.('Failed to load salary structures.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateStructure = async (e) => {
    e.preventDefault();
    if (!structName) return;
    setSubmittingStruct(true);
    setStructError('');

    try {
      await payrollService.createSalaryStructure({
        name: structName,
        description: structDesc,
        components: [
          {
            name: 'Basic Pay',
            component_type: 'earning',
            calculation_type: 'percentage',
            percentage_value: basicRate,
          },
          {
            name: 'House Rent Allowance (HRA)',
            component_type: 'earning',
            calculation_type: 'percentage',
            percentage_value: hraRate,
          },
          {
            name: 'Provident Fund (PF)',
            component_type: 'deduction',
            calculation_type: 'percentage',
            percentage_value: '12.0',
          },
        ],
      });
      showToast?.('Salary structure published successfully!', 'success');
      setIsStructModalOpen(false);
      setStructName('');
      setStructDesc('');
      loadData();
    } catch (err) {
      setStructError(err.response?.data?.detail || 'Failed to create salary structure.');
    } finally {
      setSubmittingStruct(false);
    }
  };

  const handleAssignSalary = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedStructId || !baseSalary) {
      setAssignError('Please complete all assignment fields.');
      return;
    }
    setSubmittingAssign(true);
    setAssignError('');

    try {
      await payrollService.assignSalary(selectedEmpId, {
        salary_structure_id: selectedStructId,
        base_salary: baseSalary,
        effective_from: effectiveFrom,
      });
      showToast?.('Salary structure assigned to employee!', 'success');
      setIsAssignModalOpen(false);
      loadData();
    } catch (err) {
      setAssignError(err.response?.data?.detail || 'Salary assignment failed.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Salary Structures & Compensation"
        subtitle="Earnings & deductions configuration, salary tier templates, and employee base pay assignments."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Salary Structures' }]}
        actions={
          canManageHR && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedEmpId(employees[0]?.id || '');
                  setSelectedStructId(structures[0]?.id || '');
                  setAssignError('');
                  setIsAssignModalOpen(true);
                }}
                leftIcon={UserCheck}
              >
                Assign Staff Salary
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStructName('');
                  setStructDesc('');
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

      {/* Salary Structures Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-xs">
            Loading compensation templates...
          </div>
        ) : structures.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
            No salary structures configured.
          </div>
        ) : (
          structures.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                  <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                </div>
                {s.description && (
                  <p className="text-2xs text-slate-500 mt-1 leading-relaxed">{s.description}</p>
                )}

                {/* Component Breakdown */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                    Formula Components
                  </p>
                  {s.components?.map((c, idx) => (
                    <div key={c.id || idx} className="flex items-center justify-between text-2xs">
                      <span className="text-slate-700 font-medium">{c.name}</span>
                      <span
                        className={`font-mono font-semibold ${
                          c.component_type === 'deduction' ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {c.component_type === 'deduction' ? '-' : '+'}
                        {c.percentage_value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Structure Modal */}
      <Modal
        isOpen={isStructModalOpen}
        onClose={() => setIsStructModalOpen(false)}
        title="Create Salary Structure Template"
        subtitle="Define base earnings percentages and statutory deductions"
      >
        <form onSubmit={handleCreateStructure} className="space-y-4 text-xs">
          {structError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {structError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Structure Template Name *</label>
            <input
              type="text"
              value={structName}
              onChange={(e) => setStructName(e.target.value)}
              placeholder="e.g. Standard Operations Staff (Tier 1)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Basic Pay (% of Base) *</label>
              <input
                type="text"
                value={basicRate}
                onChange={(e) => setBasicRate(e.target.value)}
                placeholder="50.0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">HRA (% of Base) *</label>
              <input
                type="text"
                value={hraRate}
                onChange={(e) => setHraRate(e.target.value)}
                placeholder="20.0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={structDesc}
              onChange={(e) => setStructDesc(e.target.value)}
              placeholder="Applies to full-time coaches and reception personnel."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
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

      {/* Assign Salary Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Salary to Employee"
        subtitle="Map base monthly compensation and salary structure"
      >
        <form onSubmit={handleAssignSalary} className="space-y-4 text-xs">
          {assignError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
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
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} ({e.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Salary Structure *</label>
            <select
              value={selectedStructId}
              onChange={(e) => setSelectedStructId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Monthly Base Pay (INR) *</label>
              <input
                type="text"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="35000.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
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
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SalaryStructuresPage;
