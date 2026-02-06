import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const divisions = ['All', 'Office', 'Personal'];
const categories = ['All', 'Fuel', 'Movie', 'Food', 'Loan', 'Medical', 'Salary', 'Transfer'];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState('month');
  const [division, setDivision] = useState('All');
  const [category, setCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [summary, setSummary] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [accountSummary, setAccountSummary] = useState([]);
  const [activeTab, setActiveTab] = useState('income');

  const loadData = async () => {
    const params = {};
    if (division !== 'All') params.division = division;
    if (category !== 'All') params.category = category;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const [txRes, sumRes, catRes, accRes] = await Promise.all([
      axios.get(`${API_BASE}/api/transactions`, { params }),
      axios.get(`${API_BASE}/api/summary`, { params: { groupBy: period } }),
      axios.get(`${API_BASE}/api/summary/categories`),
      axios.get(`${API_BASE}/api/accounts/summary`)
    ]);
    setTransactions(txRes.data);
    setSummary(sumRes.data);
    setCategorySummary(catRes.data);
    setAccountSummary(accRes.data);
  };

  useEffect(() => {
    loadData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, division, category, startDate, endDate]);

  const openNewModal = () => {
    setEditingTx(null);
    setActiveTab('income');
    setShowModal(true);
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setActiveTab(tx.type === 'expense' ? 'expense' : 'income');
    setShowModal(true);
  };

  const handleSave = async (payload, isEdit) => {
    if (isEdit) {
      await axios.put(`${API_BASE}/api/transactions/${editingTx._id}`, payload);
    } else {
      await axios.post(`${API_BASE}/api/transactions`, payload);
    }
    setShowModal(false);
    setEditingTx(null);
    await loadData();
  };

  const periodCards = useMemo(
    () =>
      summary.map((s) => {
        let income = 0;
        let expense = 0;
        s.totals.forEach((t) => {
          if (t.type === 'income') income = t.totalAmount;
          if (t.type === 'expense') expense = t.totalAmount;
        });
        return { period: s._id, income, expense };
      }),
    [summary]
  );

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Money Manager</h1>
          <p className="text-sm text-slate-400">
            Track income, expenses, and transfers with powerful filters.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-emerald-400"
        >
          + Add Transaction
        </button>
      </header>

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">View</p>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
          >
            <option value="month">Month wise</option>
            <option value="week">Week wise</option>
            <option value="year">Year wise</option>
          </select>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Division</p>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
          >
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Category</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Between dates</p>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            />
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-800 p-4 md:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Income vs Expense</h2>
          <div className="space-y-2">
            {periodCards.map((p) => (
              <div
                key={p.period}
                className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs"
              >
                <span className="text-slate-300">{p.period}</span>
                <div className="flex gap-4">
                  <span className="text-emerald-400">Income: ₹{p.income}</span>
                  <span className="text-rose-400">Expense: ₹{p.expense}</span>
                </div>
              </div>
            ))}
            {periodCards.length === 0 && (
              <p className="text-xs text-slate-500">No data available for this period.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-slate-800 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">Category Summary</h2>
            <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {categorySummary.map((c) => (
                <div key={`${c._id.category}-${c._id.type}`} className="flex justify-between">
                  <span className="text-slate-300">
                    {c._id.category} ({c._id.type})
                  </span>
                  <span className="text-slate-100">₹{c.totalAmount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-slate-800 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">Account Balances</h2>
            <div className="space-y-1 text-xs">
              {accountSummary.map((a) => (
                <div key={a.account} className="flex justify-between">
                  <span className="text-slate-300">{a.account}</span>
                  <span className={a.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    ₹{a.balance}
                  </span>
                </div>
              ))}
              {accountSummary.length === 0 && (
                <p className="text-xs text-slate-500">No account data yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-slate-800 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-200">History</h2>
        <div className="max-h-80 overflow-y-auto text-xs">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 bg-slate-900">
              <tr>
                <th className="px-2 py-1 font-medium text-slate-400">Date &amp; Time</th>
                <th className="px-2 py-1 font-medium text-slate-400">Type</th>
                <th className="px-2 py-1 font-medium text-slate-400">Division</th>
                <th className="px-2 py-1 font-medium text-slate-400">Category</th>
                <th className="px-2 py-1 font-medium text-slate-400">Description</th>
                <th className="px-2 py-1 font-medium text-slate-400">Amount</th>
                <th className="px-2 py-1 font-medium text-slate-400">Accounts</th>
                <th className="px-2 py-1 font-medium text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id} className="border-b border-slate-700/60">
                  <td className="px-2 py-1 text-slate-200">
                    {new Date(t.date).toLocaleString()}
                  </td>
                  <td className="px-2 py-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : t.type === 'expense'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-sky-500/10 text-sky-400'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-slate-300">{t.division}</td>
                  <td className="px-2 py-1 text-slate-300">{t.category}</td>
                  <td className="px-2 py-1 text-slate-200">{t.description}</td>
                  <td className="px-2 py-1 text-slate-100">₹{t.amount}</td>
                  <td className="px-2 py-1 text-slate-300">
                    {t.fromAccount && <span>From: {t.fromAccount} </span>}
                    {t.toAccount && <span>To: {t.toAccount}</span>}
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => openEditModal(t)}
                      className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-100 hover:bg-slate-600"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-2 py-4 text-center text-slate-500">
                    No transactions found. Click &quot;Add Transaction&quot; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <TransactionModal
          onClose={() => {
            setShowModal(false);
            setEditingTx(null);
          }}
          onSave={handleSave}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          editingTx={editingTx}
        />
      )}
    </div>
  );
}

function TransactionModal({ onClose, onSave, activeTab, setActiveTab, editingTx }) {
  const isEdit = !!editingTx;
  const [form, setForm] = useState(() => {
    if (editingTx) {
      return {
        amount: editingTx.amount,
        description: editingTx.description,
        category: editingTx.category,
        division: editingTx.division,
        date: editingTx.date ? editingTx.date.slice(0, 16) : '',
        fromAccount: editingTx.fromAccount || '',
        toAccount: editingTx.toAccount || ''
      };
    }
    return {
      amount: '',
      description: '',
      category: 'Fuel',
      division: 'Office',
      date: new Date().toISOString().slice(0, 16),
      fromAccount: '',
      toAccount: ''
    };
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      type: activeTab === 'income' ? 'income' : 'expense',
      amount: Number(form.amount),
      description: form.description,
      category: form.category,
      division: form.division,
      date: new Date(form.date),
      fromAccount: form.fromAccount || undefined,
      toAccount: form.toAccount || undefined
    };
    onSave(payload, isEdit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex rounded-full bg-slate-800 p-1 text-xs">
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 rounded-full py-1 ${
              activeTab === 'income' ? 'bg-emerald-500 text-slate-900' : 'text-slate-300'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 rounded-full py-1 ${
              activeTab === 'expense' ? 'bg-rose-500 text-slate-900' : 'text-slate-300'
            }`}
          >
            Expense
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block text-slate-300">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-slate-300">Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-slate-300">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              >
                {categories
                  .filter((c) => c !== 'All')
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-slate-300">Division</label>
              <select
                name="division"
                value={form.division}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              >
                <option value="Office">Office</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-slate-300">Date &amp; Time</label>
            <input
              type="datetime-local"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-slate-300">From Account</label>
              <input
                type="text"
                name="fromAccount"
                value={form.fromAccount}
                onChange={handleChange}
                placeholder="e.g., Cash, Bank"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-slate-300">To Account</label>
              <input
                type="text"
                name="toAccount"
                value={form.toAccount}
                onChange={handleChange}
                placeholder="e.g., Bank, Savings"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-slate-700 px-3 py-1 text-xs text-slate-100 hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-400"
            >
              {isEdit ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App
