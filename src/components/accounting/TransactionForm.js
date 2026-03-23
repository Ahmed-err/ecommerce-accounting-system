"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction, updateTransaction } from "@/app/actions/accounting";

const PRESET_CATEGORIES = [
  "Sales", "Salary", "Rent", "Supplies", "Utilities",
  "Maintenance", "Marketing", "Shipping", "Tax", "Other",
];

const today = () => new Date().toISOString().split("T")[0];

export default function TransactionForm({ isOpen, onClose, transaction }) {
  const isEditing = !!transaction;

  const [formData, setFormData] = useState({
    type: "INCOMING",
    amount: "",
    description: "",
    category: "",
    reference: "",
    date: today(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category,
        reference: transaction.reference || "",
        date: new Date(transaction.date).toISOString().split("T")[0],
      });
    } else {
      setFormData({
        type: "INCOMING",
        amount: "",
        description: "",
        category: "",
        reference: "",
        date: today(),
      });
    }
    setError("");
  }, [transaction, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!formData.amount || parseFloat(formData.amount) <= 0) throw new Error("Please enter a valid amount.");
      if (!formData.description.trim()) throw new Error("Description is required.");
      if (!formData.category) throw new Error("Please select a category.");

      const res = isEditing
        ? await updateTransaction(transaction.id, formData)
        : await createTransaction(formData);

      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Failed to save transaction.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isIncoming = formData.type === "INCOMING";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-gray-900 border-l border-white/10 text-white w-full sm:max-w-lg overflow-y-auto pb-24">
        <SheetHeader>
          <SheetTitle className="text-white">
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            {isEditing ? "Update the transaction details below." : "Record a new financial transaction."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 px-2 pb-6">
          {error && (
            <div className="p-3 bg-red-500/20 text-red-400 rounded-md text-sm">{error}</div>
          )}

          {/* Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Transaction Type</label>
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "INCOMING" }))}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  isIncoming ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                ↑ Incoming
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "OUTGOING" }))}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  !isIncoming ? "bg-red-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                ↓ Outgoing
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Amount ($)</label>
            <Input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
              className="bg-gray-800 border-white/10 text-white text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description</label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g. Monthly rent payment"
              required
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Category</label>
            <Select
              value={formData.category}
              onValueChange={(val) => setFormData((p) => ({ ...p, category: val }))}
            >
              <SelectTrigger className="bg-gray-800 border-white/10 text-white">
                <SelectValue placeholder="Select a category">
                  {formData.category || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10 text-white">
                {PRESET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Reference <span className="text-gray-600 text-xs">(optional)</span>
            </label>
            <Input
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="e.g. INV-2024-001"
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Date</label>
            <Input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="hover:bg-white/10">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`font-semibold text-white ${
                isIncoming
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
