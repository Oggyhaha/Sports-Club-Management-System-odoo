import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  Edit2,
  Filter,
} from 'lucide-react';
import financeService from '../../services/financeService';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../config/constants';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';

export const BusinessClientsPage = () => {
  const { user } = useAuth();
  const isOwner = user?.roles?.some((r) => (r.name || r) === ROLES.OWNER);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    tax_id_gstin: '',
    billing_address: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active';
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const data = await financeService.getClients(params);
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load business clients:', err);
      setError('Unable to load corporate business accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClients();
  };

  const handleOpenCreate = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      tax_id_gstin: '',
      billing_address: '',
      is_active: true,
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      tax_id_gstin: client.tax_id_gstin || '',
      billing_address: client.billing_address || '',
      is_active: client.is_active ?? true,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await financeService.createClient({
        company_name: formData.company_name.trim(),
        contact_person: formData.contact_person.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        tax_id_gstin: formData.tax_id_gstin.trim() || null,
        billing_address: formData.billing_address.trim() || null,
      });
      setShowCreateModal(false);
      fetchClients();
    } catch (err) {
      console.error('Failed to create corporate client:', err);
      setFormError(err.response?.data?.detail || 'Failed to register corporate client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await financeService.updateClient(selectedClient.id, {
        company_name: formData.company_name.trim(),
        contact_person: formData.contact_person.trim(),
        phone: formData.phone.trim() || null,
        tax_id_gstin: formData.tax_id_gstin.trim() || null,
        billing_address: formData.billing_address.trim() || null,
        is_active: formData.is_active,
      });
      setShowEditModal(false);
      setSelectedClient(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to update corporate client:', err);
      setFormError(err.response?.data?.detail || 'Failed to update client profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.contact_person?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tax_id_gstin?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary-600" />
            Corporate Accounts & Business Clients
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage institutional partners, corporate memberships, GSTIN compliance, and credit agreements.
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Register Corporate Client
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name, contact, email or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Clients Directory Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading business accounts...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No corporate accounts found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tax / GSTIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-sm mr-3">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {client.company_name}
                          </div>
                          {client.billing_address && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {client.billing_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.contact_person}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {client.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.tax_id_gstin ? (
                        <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                          {client.tax_id_gstin}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unspecified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle className="w-3.5 h-3.5 text-gray-500" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(client)}
                          className="text-gray-600 hover:text-primary-600"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
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

      {/* Modal: Create Client */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Register Corporate Client"
        >
          <form onSubmit={handleCreateClient} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Company Name *
              </label>
              <Input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Acme Technologies Ltd."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Contact Person *
              </label>
              <Input
                type="text"
                required
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="accounts@acme.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Phone Number
                </label>
                <Input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                GSTIN / Tax ID
              </label>
              <Input
                type="text"
                value={formData.tax_id_gstin}
                onChange={(e) => setFormData({ ...formData, tax_id_gstin: e.target.value })}
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Billing Address
              </label>
              <textarea
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                rows={2}
                placeholder="Registered business address..."
                className="w-full text-sm border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Corporate Client'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Client */}
      {showEditModal && selectedClient && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedClient(null);
          }}
          title={`Edit ${selectedClient.company_name}`}
        >
          <form onSubmit={handleUpdateClient} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Company Name *
              </label>
              <Input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Contact Person *
              </label>
              <Input
                type="text"
                required
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Phone Number
              </label>
              <Input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                GSTIN / Tax ID
              </label>
              <Input
                type="text"
                value={formData.tax_id_gstin}
                onChange={(e) => setFormData({ ...formData, tax_id_gstin: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Billing Address
              </label>
              <textarea
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <label htmlFor="is_active_toggle" className="text-sm font-medium text-gray-700">
                Corporate Account Active
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default BusinessClientsPage;
