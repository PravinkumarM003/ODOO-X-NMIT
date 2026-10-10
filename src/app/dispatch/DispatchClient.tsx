"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  FileText,
  DollarSign,
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { createDispatchAction, recordPaymentAction } from "@/app/actions/dispatchActions";

interface StoreSectionData {
  rolls: any[];
  count: number;
  metres: number;
}

interface DispatchClientProps {
  storeView: {
    shelf: StoreSectionData;
    awaitingQC: StoreSectionData;
    quarantined: StoreSectionData;
    dispatched: StoreSectionData;
  };
  readyOrders: Array<{
    id: string;
    orderNo: string;
    buyerName: string;
    fabricName: string;
    colour: string;
    pricePerMetre: number;
    eligibleRolls: any[];
    disabledRolls: any[];
  }>;
  dispatches: any[];
  invoices: any[];
}

export default function DispatchClient({
  storeView,
  readyOrders,
  dispatches,
  invoices,
}: DispatchClientProps) {
  const [activeTab, setActiveTab] = useState<"READY" | "STORE" | "DISPATCHES">("READY");

  // Create Dispatch Modal state
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any | null>(null);
  const [selectedRollIds, setSelectedRollIds] = useState<string[]>([]);
  const [truckNo, setTruckNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [confirmPrompt, setConfirmPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Record Payment Modal state
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"BANK" | "CASH" | "UPI">("BANK");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const openDispatchModal = (order: any) => {
    setDispatchModalOrder(order);
    setSelectedRollIds(order.eligibleRolls.map((r: any) => r.id));
    setTruckNo("");
    setDriverName("");
    setConfirmPrompt(false);
    setErrorMsg(null);
  };

  const handleRollToggle = (rollId: string) => {
    if (selectedRollIds.includes(rollId)) {
      setSelectedRollIds(selectedRollIds.filter((id) => id !== rollId));
    } else {
      setSelectedRollIds([...selectedRollIds, rollId]);
    }
  };

  const selectedRolls = dispatchModalOrder
    ? dispatchModalOrder.eligibleRolls.filter((r: any) => selectedRollIds.includes(r.id))
    : [];
  const selectedMetres = selectedRolls.reduce((acc: number, r: any) => acc + r.lengthMetres, 0);
  const invoiceAmountEstimate = dispatchModalOrder
    ? Math.round(selectedMetres * dispatchModalOrder.pricePerMetre * 100) / 100
    : 0;

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPrompt) {
      setConfirmPrompt(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("orderId", dispatchModalOrder.id);
    formData.append("rollIdsJson", JSON.stringify(selectedRollIds));
    formData.append("truckNo", truckNo);
    formData.append("driverName", driverName);

    const res = await createDispatchAction(formData);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
      setConfirmPrompt(false);
    } else {
      setDispatchModalOrder(null);
      setConfirmPrompt(false);
      window.location.reload();
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    setPaymentLoading(true);
    setPaymentError(null);

    const formData = new FormData();
    formData.append("invoiceId", paymentInvoice.id);
    formData.append("amount", paymentAmount);
    formData.append("method", paymentMethod);
    formData.append("reference", paymentRef);

    const res = await recordPaymentAction(formData);
    setPaymentLoading(false);

    if (res.error) {
      setPaymentError(res.error);
    } else {
      setPaymentInvoice(null);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202B32] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#176B63]" />
            Dispatch & Store Management
          </h1>
          <p className="text-xs text-[#617078] mt-0.5">
            Finished goods store, dispatch scheduling, matching invoices, and payment receipts.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DCE3E1] pb-2 text-xs">
        <button
          onClick={() => setActiveTab("READY")}
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "READY"
              ? "bg-[#172D38] text-white shadow-xs"
              : "text-[#617078] hover:text-[#202B32] hover:bg-white"
          }`}
        >
          Ready Queue ({readyOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("STORE")}
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "STORE"
              ? "bg-[#172D38] text-white shadow-xs"
              : "text-[#617078] hover:text-[#202B32] hover:bg-white"
          }`}
        >
          Store View (4 Sections, BR-18)
        </button>
        <button
          onClick={() => setActiveTab("DISPATCHES")}
          className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors ${
            activeTab === "DISPATCHES"
              ? "bg-[#172D38] text-white shadow-xs"
              : "text-[#617078] hover:text-[#202B32] hover:bg-white"
          }`}
        >
          Dispatches & Invoices ({dispatches.length})
        </button>
      </div>

      {/* TAB 1: READY QUEUE */}
      {activeTab === "READY" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#277653]" />
                  Orders with Passed Fabric on Shelf
                </h2>
                <p className="text-[11px] text-[#617078]">
                  Only rolls with qcStatus PASSED and stockStatus IN_STORE are eligible for dispatch (BR-15).
                </p>
              </div>
              <span className="text-xs font-mono-id text-[#617078]">{readyOrders.length} orders ready</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Order No</th>
                    <th className="py-2.5 px-4">Buyer</th>
                    <th className="py-2.5 px-4">Fabric</th>
                    <th className="py-2.5 px-4 text-right">Passed Rolls on Shelf</th>
                    <th className="py-2.5 px-4 text-right">Available Metres</th>
                    <th className="py-2.5 px-4 text-right">Est. Invoice Value</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E1]">
                  {readyOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#617078]">
                        No orders with dispatch-eligible rolls currently in store.
                      </td>
                    </tr>
                  ) : (
                    readyOrders.map((ro) => {
                      const shelfMetres = ro.eligibleRolls.reduce((a, r) => a + r.lengthMetres, 0);
                      const estValue = shelfMetres * ro.pricePerMetre;
                      return (
                        <tr key={ro.id} className="hover:bg-[#F9FAFA]">
                          <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">
                            <Link href={`/orders/${ro.id}`} className="hover:underline flex items-center gap-1">
                              {ro.orderNo}
                              <ExternalLink className="w-3 h-3 text-[#617078]" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#202B32]">{ro.buyerName}</td>
                          <td className="py-3 px-4 text-[#202B32]">{ro.fabricName} ({ro.colour})</td>
                          <td className="py-3 px-4 text-right font-mono-id font-bold text-[#277653]">
                            {ro.eligibleRolls.length} rolls
                          </td>
                          <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                            {shelfMetres} m
                          </td>
                          <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                            ₹{estValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openDispatchModal(ro)}
                              className="px-3 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded text-xs shadow-xs"
                            >
                              Create Dispatch (BR-15)
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STORE VIEW (4 SECTIONS PER BR-18) */}
      {activeTab === "STORE" && (
        <div className="space-y-6">
          {/* Section 1: Shelf (Passed and In store) */}
          <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-emerald-50/60 border-b border-emerald-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#277653] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  1. Finished Stock on Shelf (Passed & In Store - Available for Dispatch)
                </h3>
                <p className="text-[11px] text-[#617078]">
                  Only these rolls count as finished goods stock available to dispatch (BR-18).
                </p>
              </div>
              <span className="text-xs font-mono-id font-bold text-[#277653]">
                {storeView.shelf.count} rolls ({storeView.shelf.metres} m)
              </span>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F4F6F5] text-[#617078] font-bold text-[11px] uppercase">
                    <th className="py-2 px-4">Roll ID</th>
                    <th className="py-2 px-4">Order</th>
                    <th className="py-2 px-4">Buyer</th>
                    <th className="py-2 px-4 text-right">Length (m)</th>
                    <th className="py-2 px-4 text-center">QC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E1]">
                  {storeView.shelf.rolls.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9FAFA]">
                      <td className="py-2 px-4 font-mono-id font-bold text-[#176B63]">{r.rollNo}</td>
                      <td className="py-2 px-4 font-mono-id">{r.order.orderNo}</td>
                      <td className="py-2 px-4">{r.order.buyer.name}</td>
                      <td className="py-2 px-4 text-right font-mono-id font-bold">{r.lengthMetres} m</td>
                      <td className="py-2 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-green-100 text-[#277653] font-bold text-[10px]">
                          PASSED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Awaiting QC or rework */}
          <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-blue-50/60 border-b border-blue-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#54758A] flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  2. Awaiting QC or Rework (Pending / Rework & In Store)
                </h3>
                <p className="text-[11px] text-[#617078]">
                  Rolls registered from dye floor awaiting examination or rework clearance.
                </p>
              </div>
              <span className="text-xs font-mono-id font-bold text-[#54758A]">
                {storeView.awaitingQC.count} rolls ({storeView.awaitingQC.metres} m)
              </span>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F4F6F5] text-[#617078] font-bold text-[11px] uppercase">
                    <th className="py-2 px-4">Roll ID</th>
                    <th className="py-2 px-4">Order</th>
                    <th className="py-2 px-4">Buyer</th>
                    <th className="py-2 px-4 text-right">Length (m)</th>
                    <th className="py-2 px-4 text-center">QC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E1]">
                  {storeView.awaitingQC.rolls.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9FAFA]">
                      <td className="py-2 px-4 font-mono-id font-bold text-[#176B63]">{r.rollNo}</td>
                      <td className="py-2 px-4 font-mono-id">{r.order.orderNo}</td>
                      <td className="py-2 px-4">{r.order.buyer.name}</td>
                      <td className="py-2 px-4 text-right font-mono-id font-bold">{r.lengthMetres} m</td>
                      <td className="py-2 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          r.qcStatus === "REWORK" ? "bg-amber-100 text-[#A86F1F]" : "bg-blue-100 text-[#54758A]"
                        }`}>
                          {r.qcStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Rejected / Quarantined (BR-18 & BR-15) */}
          <div className="bg-white border border-red-300 rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-red-50/70 border-b border-red-300 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#B44545] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#B44545]" />
                  3. Rejected / Quarantined Stock (Physical Hold - Never Dispatchable)
                </h3>
                <p className="text-[11px] text-[#617078]">
                  Rejected rolls are quarantined terminal stock. Excluded from shelf totals and dispatch eligibility (BR-18).
                </p>
              </div>
              <span className="text-xs font-mono-id font-bold text-[#B44545]">
                {storeView.quarantined.count} rolls ({storeView.quarantined.metres} m)
              </span>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-red-50 text-[#B44545] font-bold text-[11px] uppercase">
                    <th className="py-2 px-4">Roll ID</th>
                    <th className="py-2 px-4">Order</th>
                    <th className="py-2 px-4">Defect Reason</th>
                    <th className="py-2 px-4">Severity</th>
                    <th className="py-2 px-4 text-right">Length (m)</th>
                    <th className="py-2 px-4 text-right">QC Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E1]">
                  {storeView.quarantined.rolls.map((r) => {
                    const latestQC = r.qcRecords[0];
                    return (
                      <tr key={r.id} className="hover:bg-red-50/30">
                        <td className="py-2 px-4 font-mono-id font-bold text-[#B44545]">{r.rollNo}</td>
                        <td className="py-2 px-4 font-mono-id">{r.order.orderNo}</td>
                        <td className="py-2 px-4 text-[#202B32]">{latestQC?.defectType || "Major Defect"}</td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-0.5 rounded bg-red-100 text-[#B44545] font-bold text-[10px]">
                            {latestQC?.severity || "CRITICAL"}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono-id font-bold text-[#B44545]">{r.lengthMetres} m</td>
                        <td className="py-2 px-4 text-right">
                          <Link href={`/rolls/${r.id}`} className="text-[#176B63] hover:underline font-semibold">
                            View Passport →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Dispatched */}
          <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-purple-50/60 border-b border-purple-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-purple-700" />
                  4. Dispatched History (Out of Store)
                </h3>
                <p className="text-[11px] text-[#617078]">
                  Rolls loaded onto trucks and matched to commercial invoices.
                </p>
              </div>
              <span className="text-xs font-mono-id font-bold text-purple-800">
                {storeView.dispatched.count} rolls ({storeView.dispatched.metres} m)
              </span>
            </div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F4F6F5] text-[#617078] font-bold text-[11px] uppercase">
                    <th className="py-2 px-4">Roll ID</th>
                    <th className="py-2 px-4">Order</th>
                    <th className="py-2 px-4">Dispatch Reference</th>
                    <th className="py-2 px-4">Invoice Reference</th>
                    <th className="py-2 px-4 text-right">Length (m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E1]">
                  {storeView.dispatched.rolls.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9FAFA]">
                      <td className="py-2 px-4 font-mono-id font-bold text-[#176B63]">{r.rollNo}</td>
                      <td className="py-2 px-4 font-mono-id">{r.order.orderNo}</td>
                      <td className="py-2 px-4 font-mono-id text-purple-700">
                        {r.dispatchLine?.dispatch.dispatchNo || "—"}
                      </td>
                      <td className="py-2 px-4 font-mono-id text-[#176B63]">
                        {r.dispatchLine?.dispatch.invoice?.invoiceNo || "—"}
                      </td>
                      <td className="py-2 px-4 text-right font-mono-id font-bold">{r.lengthMetres} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCHES & INVOICES */}
      {activeTab === "DISPATCHES" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE3E1] rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-[#F4F6F5] border-b border-[#DCE3E1] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#202B32] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#176B63]" />
                Commercial Invoices & Payment Ledger
              </h2>
              <span className="text-xs text-[#617078]">{invoices.length} invoices issued</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#DCE3E1] text-[#617078] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Invoice No</th>
                    <th className="py-2.5 px-4">Dispatch No</th>
                    <th className="py-2.5 px-4">Order No</th>
                    <th className="py-2.5 px-4">Buyer</th>
                    <th className="py-2.5 px-4 text-right">Invoice Amount (₹)</th>
                    <th className="py-2.5 px-4 text-right">Paid Amount (₹)</th>
                    <th className="py-2.5 px-4 text-center">Payment Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E1]">
                  {invoices.map((inv) => {
                    const totalPaid = inv.payments.reduce((a: number, p: any) => a + p.amount, 0);
                    const balance = Math.round((inv.amount - totalPaid) * 100) / 100;
                    return (
                      <tr key={inv.id} className="hover:bg-[#F9FAFA]">
                        <td className="py-3 px-4 font-mono-id font-bold text-[#176B63]">{inv.invoiceNo}</td>
                        <td className="py-3 px-4 font-mono-id text-[#54758A]">{inv.dispatch.dispatchNo}</td>
                        <td className="py-3 px-4 font-mono-id text-[#202B32]">{inv.order.orderNo}</td>
                        <td className="py-3 px-4 font-semibold text-[#202B32]">{inv.order.buyer.name}</td>
                        <td className="py-3 px-4 text-right font-mono-id font-bold text-[#202B32]">
                          ₹{inv.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-id font-bold text-[#277653]">
                          ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inv.status === "PAID"
                                ? "bg-green-100 text-[#277653]"
                                : inv.status === "PARTIAL"
                                ? "bg-amber-100 text-[#A86F1F]"
                                : "bg-red-100 text-[#B44545]"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.status !== "PAID" ? (
                            <button
                              onClick={() => {
                                setPaymentInvoice(inv);
                                setPaymentAmount(balance.toString());
                                setPaymentRef("");
                                setPaymentError(null);
                              }}
                              className="px-2.5 py-1 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded text-xs shadow-xs"
                            >
                              Record Payment
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#277653] font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Dispatch Modal (BR-15, BR-17) */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-lg w-full p-6 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-1 flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#176B63]" />
              Create Truck Dispatch
            </h3>
            <p className="text-[#617078] mb-4">
              Order <strong>{dispatchModalOrder.orderNo}</strong> for <strong>{dispatchModalOrder.buyerName}</strong>.
            </p>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              {/* Eligible Rolls Selection */}
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Select Passed Rolls for Consignment *
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 border border-[#DCE3E1] rounded bg-[#F9FAFA]">
                  {dispatchModalOrder.eligibleRolls.map((r: any) => (
                    <label key={r.id} className="flex items-center justify-between p-1.5 bg-white rounded border border-[#DCE3E1] cursor-pointer hover:border-[#176B63]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRollIds.includes(r.id)}
                          onChange={() => handleRollToggle(r.id)}
                          className="rounded text-[#176B63]"
                        />
                        <span className="font-mono-id font-bold text-[#176B63]">{r.rollNo}</span>
                      </div>
                      <span className="font-mono-id font-semibold text-[#202B32]">{r.lengthMetres} m</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Disabled Unresolved Rolls (Section 7.8) */}
              {dispatchModalOrder.disabledRolls.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-[#A86F1F]">
                  <strong>Note:</strong> {dispatchModalOrder.disabledRolls.length} roll(s) belonging to this order are still in QC or Rework and are not selectable.
                </div>
              )}

              {/* Truck and Driver details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Truck Registration No *
                  </label>
                  <input
                    type="text"
                    required
                    value={truckNo}
                    onChange={(e) => setTruckNo(e.target.value)}
                    placeholder="e.g. TN 38 AA 1234"
                    className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#202B32] mb-1">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. R. Selvaraj"
                    className="w-full px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                  />
                </div>
              </div>

              {/* Summary panel (BR-17) */}
              <div className="p-3 bg-[#EBF3F1] border border-[#C5DDD7] rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Selected Rolls:</span>
                  <strong className="font-mono-id">{selectedRolls.length} roll(s)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Consignment Metres:</span>
                  <strong className="font-mono-id">{selectedMetres} m</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#176B63]/20 text-[#11564F] font-bold">
                  <span>Generated Invoice Amount (BR-17):</span>
                  <span className="font-mono-id">₹{invoiceAmountEstimate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Confirmation Dialog (Section 7.8) */}
              {confirmPrompt && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 font-semibold text-xs">
                  Confirm dispatch of {selectedRolls.length} rolls ({selectedMetres} m) to {dispatchModalOrder.buyerName}? This will lock the rolls and issue Invoice INV.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setDispatchModalOrder(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedRolls.length === 0}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
                >
                  {loading
                    ? "Generating Dispatch & Invoice..."
                    : confirmPrompt
                    ? "Yes, Confirm Dispatch"
                    : "Review & Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal (BR-19) */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#DCE3E1] max-w-md w-full p-6 text-xs">
            <h3 className="text-sm font-bold text-[#202B32] uppercase tracking-wider mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#176B63]" />
              Record Buyer Payment
            </h3>
            <p className="text-[#617078] mb-4">
              Invoice <strong>{paymentInvoice.invoiceNo}</strong> ({paymentInvoice.order.buyer.name}) · Amount: ₹{paymentInvoice.amount.toLocaleString()}.
            </p>

            {paymentError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-[#B44545] rounded mb-3 font-semibold">
                {paymentError}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                >
                  <option value="BANK">Bank Transfer (NEFT / RTGS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202B32] mb-1">
                  Bank Reference / UTR
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UTR-8899201"
                  className="w-full font-mono-id px-3 py-1.5 border border-[#DCE3E1] rounded text-[#202B32]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3E1]">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-3 py-1.5 border border-[#DCE3E1] rounded text-[#617078]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-4 py-1.5 bg-[#176B63] hover:bg-[#11564F] text-white font-semibold rounded disabled:opacity-50"
                >
                  {paymentLoading ? "Saving..." : "Record Payment (BR-19)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
