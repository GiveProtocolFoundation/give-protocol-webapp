import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAdminImpactMetrics } from '@/hooks/useAdminImpactMetrics';
import type { FundImpactMetric } from '@/types/impact';

interface MetricRowProps {
  metric: FundImpactMetric;
  fundLabel: string;
  onEdit: (_metric: FundImpactMetric) => void;
  onDelete: (_id: string) => void;
}

/** Table row displaying a single impact metric with edit and delete actions. */
function MetricRowBase({ metric, fundLabel, onEdit, onDelete }: MetricRowProps): React.ReactElement {
  const handleEdit = useCallback(() => {
    onEdit(metric);
  }, [metric, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(metric.id);
  }, [metric.id, onDelete]);

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-900">{fundLabel}</td>
      <td className="px-4 py-3 text-gray-900">{metric.unitName}</td>
      <td className="px-4 py-3 text-gray-900">${metric.unitCostUsd.toFixed(2)}</td>
      <td className="px-4 py-3 text-gray-500">{metric.unitIcon}</td>
      <td className="px-4 py-3 text-gray-500">{metric.sortOrder}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="text-sm text-[#0d9f6e] hover:underline"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

const MetricRow = React.memo(MetricRowBase);

const METRIC_COLUMNS = ['Fund', 'Unit Name', 'Cost (USD)', 'Icon', 'Order', 'Actions'];

/** Header row for the metrics table. */
function MetricsTableHeader(): React.ReactElement {
  return (
    <thead>
      <tr className="border-b bg-gray-50">
        {METRIC_COLUMNS.map((col) => (
          <th scope="col" key={col} className="px-4 py-3 font-medium text-gray-600">{col}</th>
        ))}
      </tr>
    </thead>
  );
}

/** Table displaying impact metrics with edit/delete actions per row. */
function MetricsTable({ metrics, fundLabel, onEdit, onDelete }: {
  metrics: FundImpactMetric[];
  fundLabel: (_fundId: string) => string;
  onEdit: (_metric: FundImpactMetric) => void;
  onDelete: (_id: string) => void;
}): React.ReactElement {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">Impact metrics management</caption>
        <MetricsTableHeader />
        <tbody>
          {metrics.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                No metrics found.
              </td>
            </tr>
          ) : (
            metrics.map((metric) => (
              <MetricRow
                key={metric.id}
                metric={metric}
                fundLabel={fundLabel(metric.fundId)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}

const FUND_OPTIONS = [
  { value: '1', label: 'Environmental Impact Fund' },
  { value: '2', label: 'Poverty Relief Impact Fund' },
  { value: '3', label: 'Education Impact Fund' },
];

const ICON_OPTIONS = [
  'heart', 'trees', 'sprout', 'wind', 'utensils',
  'heart-pulse', 'hand-coins', 'graduation-cap', 'book-open', 'award',
];

/** Form for creating or editing an impact metric. */
function MetricForm({ form, saving, editingId, onFormChange, onSubmit, onCancel }: {
  form: FormState;
  saving: boolean;
  editingId: string | null;
  onFormChange: (_e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (_e: React.FormEvent) => void;
  onCancel: () => void;
}): React.ReactElement {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="form-fund" className="block text-sm font-medium text-gray-700 mb-1">Fund</label>
        <select id="form-fund" name="fund_id" value={form.fund_id} onChange={onFormChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none">
          {FUND_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="form-unit-name" className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
        <input id="form-unit-name" name="unit_name" type="text" required value={form.unit_name} onChange={onFormChange} placeholder='e.g. "Acres of Rainforest Protected"' className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none" />
      </div>
      <div>
        <label htmlFor="form-cost" className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (USD)</label>
        <input id="form-cost" name="unit_cost_usd" type="number" required min="0.01" step="0.01" value={form.unit_cost_usd} onChange={onFormChange} placeholder="25.00" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none" />
      </div>
      <div>
        <label htmlFor="form-icon" className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
        <select id="form-icon" name="unit_icon" value={form.unit_icon} onChange={onFormChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none">
          {ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>{icon}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="form-template" className="block text-sm font-medium text-gray-700 mb-1">Description Template</label>
        <input id="form-template" name="description_template" type="text" required value={form.description_template} onChange={onFormChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none" />
        <p className="text-xs text-gray-500 mt-1">{'Use {{value}} and {{unit_name}} as placeholders.'}</p>
      </div>
      <div>
        <label htmlFor="form-sort" className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
        <input id="form-sort" name="sort_order" type="number" required min="0" value={form.sort_order} onChange={onFormChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0d9f6e] text-white rounded-lg hover:bg-[#0a8a5e] disabled:opacity-60">
          {saving && 'Saving...'}
          {!saving && editingId && 'Update'}
          {!saving && !editingId && 'Create'}
        </button>
      </div>
    </form>
  );
}

interface FormState {
  fund_id: string;
  unit_name: string;
  unit_cost_usd: string;
  unit_icon: string;
  description_template: string;
  sort_order: string;
}

const EMPTY_FORM: FormState = {
  fund_id: '1',
  unit_name: '',
  unit_cost_usd: '',
  unit_icon: 'heart',
  description_template: 'This could provide {{value}} {{unit_name}}',
  sort_order: '0',
};

/**
 * Admin page for managing impact metrics used by the Impact Calculator.
 *
 * @returns Rendered admin page
 */
const ImpactMetricsAdmin: React.FC = () => {
  const { metrics, loading, error, fetchAllMetrics, createMetric, updateMetric, deleteMetric } = useAdminImpactMetrics();

  const [filterFund, setFilterFund] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  const filteredMetrics = filterFund === 'all'
    ? metrics
    : metrics.filter((m) => m.fundId === filterFund);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterFund(e.target.value);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
    setSuccessMessage(null);
  }, []);

  const handleOpenEdit = useCallback((metric: FundImpactMetric) => {
    setEditingId(metric.id);
    setForm({
      fund_id: metric.fundId,
      unit_name: metric.unitName,
      unit_cost_usd: String(metric.unitCostUsd),
      unit_icon: metric.unitIcon,
      description_template: metric.descriptionTemplate,
      sort_order: String(metric.sortOrder),
    });
    setModalOpen(true);
    setSuccessMessage(null);
  }, []);

  const handleOpenDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setDeletingId(null);
  }, []);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);

    const payload = {
      fund_id: form.fund_id,
      unit_name: form.unit_name,
      unit_cost_usd: Number.parseFloat(form.unit_cost_usd),
      unit_icon: form.unit_icon,
      description_template: form.description_template,
      sort_order: Number.parseInt(form.sort_order, 10),
    };

    const ok = editingId
      ? await updateMetric(editingId, payload)
      : await createMetric(payload);

    setSaving(false);
    if (ok) {
      setModalOpen(false);
      setEditingId(null);
      setSuccessMessage(editingId ? 'Metric updated successfully.' : 'Metric created successfully.');
    }
  }, [form, editingId, createMetric, updateMetric]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingId) return;
    setSaving(true);
    const ok = await deleteMetric(deletingId);
    setSaving(false);
    if (ok) {
      setDeleteModalOpen(false);
      setDeletingId(null);
      setSuccessMessage('Metric deleted successfully.');
    }
  }, [deletingId, deleteMetric]);

  const fundLabel = useCallback((fundId: string) => {
    const fund = FUND_OPTIONS.find((f) => f.value === fundId);
    return fund ? fund.label : fundId;
  }, []);

  if (loading && metrics.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Impact Metrics Management</h1>
        <button
          onClick={handleOpenAdd}
          className="bg-[#0d9f6e] text-white px-4 py-2 rounded-lg hover:bg-[#0a8a5e] transition-colors"
        >
          Add Metric
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Fund filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="fund-filter" className="text-sm font-medium text-gray-700">
          Filter by Fund:
        </label>
        <select
          id="fund-filter"
          value={filterFund}
          onChange={handleFilterChange}
          className="border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-[#0d9f6e] focus:ring-1 focus:ring-[#0d9f6e] outline-none"
        >
          <option value="all">All Funds</option>
          {FUND_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Metrics table */}
      <MetricsTable metrics={filteredMetrics} fundLabel={fundLabel} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Metric' : 'Add Metric'}
        size="lg"
      >
        <MetricForm form={form} saving={saving} editingId={editingId} onFormChange={handleFormChange} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Metric"
        size="sm"
      >
        <p className="text-gray-700 mb-4">Are you sure you want to delete this metric? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCloseDeleteModal}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ImpactMetricsAdmin;
