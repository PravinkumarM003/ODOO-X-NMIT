export interface RollData {
  id?: string;
  qcStatus?: string;
  stockStatus?: string;
  lengthMetres?: number;
  dispatchLine?: any;
}

export interface DerivedStatus {
  status: string;
  explanation: string;
  dispatchedMetres: number;
  shortfallNote: string | null;
}

export function deriveOrderStatusFromRolls(
  rolls: RollData[] = [],
  orderQtyMetres: number = 0
): DerivedStatus {
  const totalRegistered = rolls.length;
  const totalRegisteredMetres = rolls.reduce((acc, r) => acc + (r.lengthMetres || 0), 0);

  const eligibleRolls = rolls.filter(
    (r) => r.qcStatus === "PASSED" && r.stockStatus === "IN_STORE" && !r.dispatchLine
  );
  const unresolvedRolls = rolls.filter(
    (r) => r.qcStatus === "PENDING" || r.qcStatus === "REWORK"
  );
  const dispatchedRolls = rolls.filter(
    (r) => r.dispatchLine || r.stockStatus === "DISPATCHED"
  );
  const rejectedRolls = rolls.filter(
    (r) => r.qcStatus === "REJECTED"
  );

  const eligibleCount = eligibleRolls.length;
  const unresolvedCount = unresolvedRolls.length;
  const dispatchedCount = dispatchedRolls.length;
  const dispatchedMetres = dispatchedRolls.reduce((acc, r) => acc + (r.lengthMetres || 0), 0);
  const rejectedMetres = rejectedRolls.reduce((acc, r) => acc + (r.lengthMetres || 0), 0);

  // 1. At least one roll dispatched
  if (dispatchedCount > 0) {
    if (eligibleCount > 0 || unresolvedCount > 0) {
      return {
        status: "PARTIALLY_DISPATCHED",
        explanation: `Dispatched ${dispatchedMetres.toFixed(1)} m of ${orderQtyMetres.toFixed(1)} m ordered (${eligibleCount} rolls ready on shelf)`,
        dispatchedMetres,
        shortfallNote: null,
      };
    } else {
      const shortfallNote = rejectedMetres > 0
        ? `Delivered ${dispatchedMetres.toFixed(1)} of ${orderQtyMetres.toFixed(1)} m (${rejectedMetres.toFixed(1)} m rejected)`
        : `Delivered ${dispatchedMetres.toFixed(1)} of ${orderQtyMetres.toFixed(1)} m`;
      return {
        status: "COMPLETED",
        explanation: shortfallNote,
        dispatchedMetres,
        shortfallNote: rejectedMetres > 0 ? shortfallNote : null,
      };
    }
  }

  // 2. Nothing dispatched yet
  if (unresolvedCount > 0) {
    return {
      status: "IN_QC",
      explanation: `${unresolvedCount} rolls awaiting inspection or rework`,
      dispatchedMetres: 0,
      shortfallNote: null,
    };
  } else if (totalRegistered === 0) {
    return {
      status: "IN_QC",
      explanation: "No rolls registered yet",
      dispatchedMetres: 0,
      shortfallNote: null,
    };
  } else if (eligibleCount > 0) {
    const eligibleMetres = eligibleRolls.reduce((acc, r) => acc + (r.lengthMetres || 0), 0);
    return {
      status: "READY_TO_SHIP",
      explanation: `${eligibleCount} rolls passed QC (${eligibleMetres.toFixed(1)} m) ready for dispatch`,
      dispatchedMetres: 0,
      shortfallNote: null,
    };
  } else {
    // Every registered roll is rejected
    return {
      status: "IN_QC",
      explanation: `No dispatch-eligible rolls. All ${totalRegistered} registered rolls (${totalRegisteredMetres.toFixed(1)} m) were rejected. Rejected quantity: ${rejectedMetres.toFixed(1)} m of ${orderQtyMetres.toFixed(1)} m ordered. Nothing can be shipped.`,
      dispatchedMetres: 0,
      shortfallNote: `All ${totalRegistered} rolls rejected (${rejectedMetres.toFixed(1)} m)`,
    };
  }
}

export function recomputeOrderStatus(rolls: RollData[] = [], orderQtyMetres: number = 0): DerivedStatus {
  return deriveOrderStatusFromRolls(rolls, orderQtyMetres);
}
