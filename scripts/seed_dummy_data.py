# pyright: reportMissingImports=false
import os
import sys
import random
import uuid
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.db.session import SessionLocal  # type: ignore
    from app.models.entities import (  # type: ignore
        User,
        Buyer,
        Supplier,
        FabricType,
        YarnItem,
        YarnLot,
        StockMovement,
        Order,
        Machine,
        WorkOrder,
        ProductionLog,
        MachineDowntime,
        Roll,
        QCRecord,
        Dispatch,
        DispatchLine,
        Invoice,
        Payment,
        SupplierBill,
        Employee,
        Attendance,
        WageSummary,
    )
except ImportError:
    from backend.app.db.session import SessionLocal  # type: ignore
    from backend.app.models.entities import (  # type: ignore
        User,
        Buyer,
        Supplier,
        FabricType,
        YarnItem,
        YarnLot,
        StockMovement,
        Order,
        Machine,
        WorkOrder,
        ProductionLog,
        MachineDowntime,
        Roll,
        QCRecord,
        Dispatch,
        DispatchLine,
        Invoice,
        Payment,
        SupplierBill,
        Employee,
        Attendance,
        WageSummary,
    )

def generate_dummy_data(target_count=400):
    db = SessionLocal()
    print("=" * 60)
    print("TEXFLOW — IDEMPOTENT HIGH-PERFORMANCE BULK SEEDER")
    print(f"Target count: ~{target_count} records per transactional table")
    print("=" * 60)

    try:
        now = datetime.now(timezone.utc)
        random.seed(42)

        # 1. Fetch pre-existing IDs
        buyer_ids = [b.id for b in db.query(Buyer.id).all()]
        supplier_ids = [s.id for s in db.query(Supplier.id).all()]
        employee_ids = [e.id for e in db.query(Employee.id).all()]
        yarn_item_ids = [y.id for y in db.query(YarnItem.id).all()]
        fabric_ids = [f.id for f in db.query(FabricType.id).all()]
        existing_machines = db.query(Machine).all()
        weaving_machines = [m for m in existing_machines if m.type == "WEAVING"] or existing_machines
        dyeing_machines = [m for m in existing_machines if m.type == "DYEING"] or existing_machines
        spinning_machines = [m for m in existing_machines if m.type == "SPINNING"] or existing_machines

        # 2. Master Data: Buyers, Suppliers, Employees if needed
        if len(buyer_ids) < 10:
            print("Seeding synthetic buyers...")
            new_buyers = []
            for i in range(len(buyer_ids) + 1, 15):
                b = Buyer(
                    id=f"syn-buyer-{i}",
                    name=f"Synthetic Apparel Ltd #{i}",
                    contactPerson=f"Buyer Contact {i}",
                    email=f"buyer.syn{i}@everest.demo",
                    phone=f"+91 98765 {10000+i}",
                    address=f"Industrial Zone #{i}, Tirupur, TN",
                )
                new_buyers.append(b)
            db.add_all(new_buyers)
            db.commit()
            buyer_ids = [b.id for b in db.query(Buyer.id).all()]

        if len(supplier_ids) < 8:
            print("Seeding synthetic suppliers...")
            new_suppliers = []
            for i in range(len(supplier_ids) + 1, 10):
                s = Supplier(
                    id=f"syn-sup-{i}",
                    name=f"Synthetic Spinners Co #{i}",
                    contactPerson=f"Supplier Rep {i}",
                    phone=f"+91 94432 {20000+i}",
                )
                new_suppliers.append(s)
            db.add_all(new_suppliers)
            db.commit()
            supplier_ids = [s.id for s in db.query(Supplier.id).all()]

        if len(employee_ids) < 250:
            target_emp_count = 250
            needed_emp = target_emp_count - len(employee_ids)
            print(f"Seeding synthetic employees to reach {target_emp_count}+ total (adding {needed_emp})...")
            new_employees = []
            departments = ["WEAVING", "SPINNING", "DYEING", "QUALITY", "MAINTENANCE", "DISPATCH", "FINANCE", "LOGISTICS", "ADMIN"]
            job_titles = [
                "Senior Loom Operator", "Spinning Master", "Dyeing Supervisor", 
                "QC Specialist", "Maintenance Engineer", "Shift Supervisor", 
                "Helper", "Logistics Coordinator", "Wage Clerk", "Floor Manager"
            ]
            
            first_names = [
                "Arun", "Karthik", "Senthil", "Murugan", "Ramesh", "Suresh", "Prakash", "Venkatesh", "Vijay", "Ganesh",
                "Dinesh", "Saravanan", "Anand", "Manikandan", "Subramanian", "Balaji", "Sundar", "Rajesh", "Kannan", "Kumar",
                "Priya", "Lakshmi", "Kavitha", "Deepa", "Anitha", "Meena", "Divya", "Revathi", "Gayathri", "Radha",
                "Nitin", "Rahul", "Amit", "Vikram", "Sanjay", "Manoj", "Pradeep", "Ashok", "Santhosh", "Gokul",
                "Bala", "Velu", "Selvam", "Mani", "Raja", "Pandian", "Natarajan", "Shanmugam", "Durai", "Moorthy"
            ]
            last_names = [
                "Kumar", "Rajan", "Nathan", "Pillai", "Chettiar", "Ganesan", "Sharma", "Verma", "Varghese", "Nair",
                "Reddy", "Rao", "Patel", "Joshi", "Singhania", "Iyer", "Iyengar", "Mudaliar", "Naidu", "Menon"
            ]

            for i in range(len(employee_ids) + 1, len(employee_ids) + 1 + needed_emp):
                emp_no = f"EMP-{str(i).zfill(4)}"
                name = f"{random.choice(first_names)} {random.choice(last_names)}"
                dept = random.choice(departments)
                job = random.choice(job_titles)
                e = Employee(
                    id=f"syn-emp-{i}",
                    empNo=emp_no,
                    name=name,
                    department=dept,
                    jobTitle=job,
                    dailyWage=float(random.randint(550, 1400)),
                    overtimeRatePerHour=float(random.randint(100, 220)),
                    active=True,
                )
                new_employees.append(e)
            db.add_all(new_employees)
            db.commit()
            employee_ids = [e.id for e in db.query(Employee.id).all()]

        # Seed Attendance for today for all employees if not present
        today_str = now.strftime("%Y-%m-%d")
        existing_att_emp_ids = set(r[0] for r in db.query(Attendance.employeeId).filter(Attendance.date == today_str).all())
        missing_att_emp_ids = [eid for eid in employee_ids if eid not in existing_att_emp_ids]
        if missing_att_emp_ids:
            print(f"Seeding today's attendance for {len(missing_att_emp_ids)} employees...")
            att_data = []
            statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "ABSENT", "LEAVE"]
            shifts = ["MORNING", "EVENING", "NIGHT"]
            for eid in missing_att_emp_ids:
                st = random.choice(statuses)
                ot = float(random.choice([0, 0, 0, 1.5, 2.0, 3.0])) if st == "PRESENT" else 0.0
                att_data.append({
                    "id": str(uuid.uuid4()),
                    "employeeId": eid,
                    "date": today_str,
                    "shift": random.choice(shifts),
                    "status": st,
                    "overtimeHours": ot,
                })
            db.bulk_insert_mappings(Attendance, att_data)
            db.commit()

        # 3. Yarn Lots (target ~400)
        existing_lots_count = db.query(YarnLot).count()
        needed_lots = max(0, target_count - existing_lots_count)
        if needed_lots > 0:
            print(f"Bulk inserting {needed_lots} YarnLots...")
            lots_data = []
            for i in range(1, needed_lots + 1):
                idx = existing_lots_count + i
                dt = now - timedelta(days=random.randint(1, 180))
                lots_data.append({
                    "id": str(uuid.uuid4()),
                    "lotCode": f"LOT-SYN-{str(idx).zfill(4)}",
                    "yarnItemId": random.choice(yarn_item_ids),
                    "supplierId": random.choice(supplier_ids),
                    "receivedAt": int(dt.timestamp() * 1000),
                    "qtyReceivedKg": float(random.choice([500, 1000, 1500, 2000])),
                    "unitCostPerKg": round(random.uniform(220.0, 380.0), 2),
                    "receivedBy": "Inventory Supervisor",
                })
            db.bulk_insert_mappings(YarnLot, lots_data)
            db.commit()

        yarn_lots = db.query(YarnLot.id).all()
        yarn_lot_ids = [l.id for l in yarn_lots]

        # 4. Orders (target ~400)
        existing_orders_count = db.query(Order).count()
        needed_orders = max(0, target_count - existing_orders_count)
        if needed_orders > 0:
            print(f"Bulk inserting {needed_orders} Orders...")
            statuses = ["APPROVED", "IN_PRODUCTION", "IN_QC", "READY_TO_SHIP", "COMPLETED", "CANCELLED"]
            colors = ["Navy Blue", "Charcoal Grey", "Olive Green", "Crimson Red", "White", "Black", "Royal Blue", "Beige"]
            orders_data = []
            for i in range(1, needed_orders + 1):
                idx = existing_orders_count + i
                dt_created = now - timedelta(days=random.randint(5, 120))
                dt_deadline = dt_created + timedelta(days=random.randint(10, 40))
                qty_m = float(random.randint(1000, 10000))
                st = random.choice(statuses)

                orders_data.append({
                    "id": str(uuid.uuid4()),
                    "orderNo": f"ORD-SYN-{str(idx).zfill(4)}",
                    "buyerId": random.choice(buyer_ids),
                    "fabricTypeId": random.choice(fabric_ids),
                    "colour": random.choice(colors),
                    "qtyMetres": qty_m,
                    "deadline": int(dt_deadline.timestamp() * 1000),
                    "pricePerMetre": round(random.uniform(140.0, 320.0), 2),
                    "status": st,
                    "currentStage": "WEAVING" if st in ["IN_PRODUCTION", "IN_QC"] else ("COMPLETED" if st == "COMPLETED" else "SPINNING"),
                    "yarnRequiredKg": round(qty_m * 0.25, 2),
                    "shortageKg": 0.0,
                    "submittedByBuyer": random.choice([True, False]),
                    "createdAt": int(dt_created.timestamp() * 1000),
                    "createdBy": "System Seeder",
                })
            db.bulk_insert_mappings(Order, orders_data)
            db.commit()

        orders_list = db.query(Order).all()

        # 5. WorkOrders (target ~400)
        existing_wo_count = db.query(WorkOrder).count()
        needed_wo = max(0, target_count - existing_wo_count)
        if needed_wo > 0:
            print(f"Bulk inserting {needed_wo} WorkOrders...")
            existing_pairs = set(db.query(WorkOrder.orderId, WorkOrder.stage).all())
            wo_data = []
            stages = ["SPINNING", "WEAVING", "DYEING"]

            for i in range(1, needed_wo + 500):
                if len(wo_data) >= needed_wo:
                    break
                target_ord = random.choice(orders_list)
                stage = stages[len(wo_data) % len(stages)]
                pair = (target_ord.id, stage)
                if pair in existing_pairs:
                    continue
                existing_pairs.add(pair)

                mach = random.choice(spinning_machines if stage == "SPINNING" else (weaving_machines if stage == "WEAVING" else dyeing_machines))
                st = "COMPLETED" if target_ord.status in ["COMPLETED", "READY_TO_SHIP"] else "IN_PROGRESS"

                wo_data.append({
                    "id": str(uuid.uuid4()),
                    "orderId": target_ord.id,
                    "stage": stage,
                    "machineId": mach.id if mach else None,
                    "plannedQtyMetres": target_ord.qtyMetres,
                    "producedQtyMetres": target_ord.qtyMetres if st == "COMPLETED" else round(target_ord.qtyMetres * random.uniform(0.3, 0.9), 2),
                    "status": st,
                    "startedAt": int((now - timedelta(days=20)).timestamp() * 1000),
                    "completedAt": int((now - timedelta(days=5)).timestamp() * 1000) if st == "COMPLETED" else None,
                })
            if wo_data:
                db.bulk_insert_mappings(WorkOrder, wo_data)
                db.commit()

        work_orders_list = db.query(WorkOrder.id).all()
        wo_ids = [w.id for w in work_orders_list]

        # 6. ProductionLogs (target ~400)
        existing_pl_count = db.query(ProductionLog).count()
        needed_pl = max(0, target_count - existing_pl_count)
        if needed_pl > 0:
            print(f"Bulk inserting {needed_pl} ProductionLogs...")
            pl_data = []
            shifts = ["MORNING", "EVENING", "NIGHT"]
            for i in range(1, needed_pl + 1):
                dt_log = now - timedelta(days=random.randint(1, 60))
                pl_data.append({
                    "id": str(uuid.uuid4()),
                    "workOrderId": random.choice(wo_ids),
                    "employeeId": random.choice(employee_ids),
                    "qtyMetres": float(random.randint(200, 800)),
                    "hours": float(random.randint(4, 8)),
                    "shift": random.choice(shifts),
                    "loggedAt": int(dt_log.timestamp() * 1000),
                })
            db.bulk_insert_mappings(ProductionLog, pl_data)
            db.commit()

        # 7. Rolls (target ~400)
        existing_rolls_count = db.query(Roll).count()
        needed_rolls = max(0, target_count - existing_rolls_count)
        if needed_rolls > 0:
            print(f"Bulk inserting {needed_rolls} Rolls...")
            rolls_data = []
            qc_statuses = ["PASSED", "PASSED", "PASSED", "REWORK", "REJECTED"]
            stock_statuses = ["IN_STORE", "IN_STORE", "DISPATCHED"]

            for i in range(1, needed_rolls + 1):
                idx = existing_rolls_count + i
                target_ord = random.choice(orders_list)
                w_mach = random.choice(weaving_machines) if weaving_machines else None
                d_mach = random.choice(dyeing_machines) if dyeing_machines else None
                dt_created = now - timedelta(days=random.randint(2, 60))

                rolls_data.append({
                    "id": str(uuid.uuid4()),
                    "rollNo": f"ROLL-SYN-{str(idx).zfill(4)}",
                    "orderId": target_ord.id,
                    "weavingMachineId": w_mach.id if w_mach else None,
                    "dyeingMachineId": d_mach.id if d_mach else None,
                    "lengthMetres": round(random.uniform(80.0, 150.0), 2),
                    "qcStatus": random.choice(qc_statuses),
                    "stockStatus": random.choice(stock_statuses),
                    "createdAt": int(dt_created.timestamp() * 1000),
                })
            db.bulk_insert_mappings(Roll, rolls_data)
            db.commit()

        rolls_list = db.query(Roll).all()
        passed_rolls = [r for r in rolls_list if r.qcStatus == "PASSED"]

        # 8. QCRecords (target ~400)
        existing_qc_count = db.query(QCRecord).count()
        needed_qc = max(0, target_count - existing_qc_count)
        if needed_qc > 0:
            print(f"Bulk inserting {needed_qc} QCRecords...")
            qc_data = []
            defect_types = ["Warp Snap", "Weft Slub", "Stain", "Uneven Dye", "Tension Line", None]
            for i in range(1, needed_qc + 1):
                idx = existing_qc_count + i
                target_roll = random.choice(rolls_list)
                res = target_roll.qcStatus if target_roll.qcStatus in ["PASSED", "REWORK", "REJECTED"] else "PASSED"
                defect = random.choice(defect_types) if res != "PASSED" else None
                dt_qc = now - timedelta(days=random.randint(1, 50))

                qc_data.append({
                    "id": str(uuid.uuid4()),
                    "qcNo": f"QC-SYN-{str(idx).zfill(4)}",
                    "rollId": target_roll.id,
                    "inspectorId": random.choice(employee_ids),
                    "inspectorName": "Quality Inspector",
                    "result": res,
                    "defectType": defect,
                    "severity": "MINOR" if res == "REWORK" else ("CRITICAL" if res == "REJECTED" else None),
                    "notes": "Automated synthetic QC inspection",
                    "createdAt": int(dt_qc.timestamp() * 1000),
                })
            db.bulk_insert_mappings(QCRecord, qc_data)
            db.commit()

        # 9. Dispatches, Lines, Invoices, Payments (target ~400)
        existing_dispatch_count = db.query(Dispatch).count()
        needed_dispatch = max(0, target_count - existing_dispatch_count)
        if needed_dispatch > 0:
            print(f"Bulk inserting {needed_dispatch} Dispatches, Lines, Invoices, Payments...")
            drivers = ["Ramesh Kumar", "Senthil Nathan", "Murugan P.", "Karthik V.", "Vijay S."]
            trucks = ["TN-37-AZ-1029", "TN-38-BY-4050", "TN-39-CX-8812", "TN-40-DW-9901"]
            existing_dispatched_roll_ids = set(r[0] for r in db.query(DispatchLine.rollId).all())

            avail_rolls = [r for r in passed_rolls if r.id not in existing_dispatched_roll_ids]

            dsp_data = []
            dl_data = []
            inv_data = []
            pay_data = []

            for i in range(1, needed_dispatch + 1):
                idx = existing_dispatch_count + i
                target_ord = random.choice(orders_list)
                dsp_id = str(uuid.uuid4())
                inv_id = str(uuid.uuid4())
                dt_dsp = now - timedelta(days=random.randint(1, 50))

                roll_for_dsp = avail_rolls.pop() if avail_rolls else None
                tot_m = roll_for_dsp.lengthMetres if roll_for_dsp else 120.0

                dsp_data.append({
                    "id": dsp_id,
                    "dispatchNo": f"DSP-SYN-{str(idx).zfill(4)}",
                    "orderId": target_ord.id,
                    "buyerId": target_ord.buyerId,
                    "truckNo": random.choice(trucks),
                    "driverName": random.choice(drivers),
                    "dispatchedAt": int(dt_dsp.timestamp() * 1000),
                    "dispatchedBy": "Dispatch Officer",
                })

                if roll_for_dsp:
                    dl_data.append({
                        "id": str(uuid.uuid4()),
                        "dispatchId": dsp_id,
                        "rollId": roll_for_dsp.id,
                        "lengthMetres": roll_for_dsp.lengthMetres,
                    })

                inv_amount = round(tot_m * target_ord.pricePerMetre, 2)
                inv_st = random.choice(["PAID", "PAID", "PARTIAL", "UNPAID"])

                inv_data.append({
                    "id": inv_id,
                    "invoiceNo": f"INV-SYN-{str(idx).zfill(4)}",
                    "orderId": target_ord.id,
                    "dispatchId": dsp_id,
                    "amount": inv_amount,
                    "status": inv_st,
                    "issuedAt": int(dt_dsp.timestamp() * 1000),
                })

                if inv_st in ["PAID", "PARTIAL"]:
                    pay_amt = inv_amount if inv_st == "PAID" else round(inv_amount * 0.5, 2)
                    pay_data.append({
                        "id": str(uuid.uuid4()),
                        "invoiceId": inv_id,
                        "amount": pay_amt,
                        "receivedAt": int((dt_dsp + timedelta(days=3)).timestamp() * 1000),
                        "method": random.choice(["BANK", "UPI", "CASH"]),
                        "reference": f"REF-SYN-{idx}",
                    })

            db.bulk_insert_mappings(Dispatch, dsp_data)
            db.commit()
            if dl_data:
                db.bulk_insert_mappings(DispatchLine, dl_data)
                db.commit()
            db.bulk_insert_mappings(Invoice, inv_data)
            db.commit()
            if pay_data:
                db.bulk_insert_mappings(Payment, pay_data)
                db.commit()

        # 10. StockMovements & SupplierBills (target ~400)
        existing_sm_count = db.query(StockMovement).count()
        needed_sm = max(0, target_count - existing_sm_count)
        if needed_sm > 0:
            print(f"Bulk inserting {needed_sm} StockMovements...")
            sm_data = []
            for i in range(1, needed_sm + 1):
                target_ord = random.choice(orders_list)
                dt_sm = now - timedelta(days=random.randint(1, 90))
                sm_data.append({
                    "id": str(uuid.uuid4()),
                    "yarnItemId": random.choice(yarn_item_ids),
                    "lotId": random.choice(yarn_lot_ids) if yarn_lot_ids else None,
                    "orderId": target_ord.id,
                    "type": random.choice(["RECEIPT", "RESERVE", "CONSUME", "RELEASE"]),
                    "qtyKg": float(random.randint(50, 500)),
                    "reason": "Synthetic stock transaction",
                    "createdBy": "System Seeder",
                    "createdAt": int(dt_sm.timestamp() * 1000),
                })
            db.bulk_insert_mappings(StockMovement, sm_data)
            db.commit()

        existing_bills_count = db.query(SupplierBill).count()
        needed_bills = max(0, target_count - existing_bills_count)
        if needed_bills > 0:
            print(f"Bulk inserting {needed_bills} SupplierBills...")
            bills_data = []
            for i in range(1, needed_bills + 1):
                idx = existing_bills_count + i
                st = random.choice(["PAID", "UNPAID"])
                dt_b = now - timedelta(days=random.randint(5, 90))
                bills_data.append({
                    "id": str(uuid.uuid4()),
                    "billNo": f"BILL-SYN-{str(idx).zfill(4)}",
                    "supplierId": random.choice(supplier_ids),
                    "lotId": random.choice(yarn_lot_ids) if yarn_lot_ids else None,
                    "amount": round(random.uniform(50000.0, 350000.0), 2),
                    "billedAt": int(dt_b.timestamp() * 1000),
                    "status": st,
                    "paidAt": int((dt_b + timedelta(days=7)).timestamp() * 1000) if st == "PAID" else None,
                })
            db.bulk_insert_mappings(SupplierBill, bills_data)
            db.commit()

        # 11. MachineDowntimes (target ~400)
        existing_dt_count = db.query(MachineDowntime).count()
        needed_dt = max(0, target_count - existing_dt_count)
        if needed_dt > 0:
            print(f"Bulk inserting {needed_dt} MachineDowntimes...")
            reasons = ["Needle Snap", "Motor Overheat", "Warp Tension Jam", "Routine Lubrication", "Belt Replacement"]
            dt_data = []
            for i in range(1, needed_dt + 1):
                mach = random.choice(existing_machines)
                dt_start = now - timedelta(days=random.randint(1, 60))
                dt_data.append({
                    "id": str(uuid.uuid4()),
                    "machineId": mach.id,
                    "startedAt": int(dt_start.timestamp() * 1000),
                    "endedAt": int((dt_start + timedelta(hours=random.randint(1, 8))).timestamp() * 1000),
                    "reason": random.choice(reasons),
                })
            db.bulk_insert_mappings(MachineDowntime, dt_data)
            db.commit()

        print("=" * 60)
        print("BULK SEEDING COMPLETED IN SECONDS!")
        print("Final Record Counts Across All Tables:")
        print("=" * 60)
        print(f"Users: {db.query(User).count()}")
        print(f"Buyers: {db.query(Buyer).count()}")
        print(f"Suppliers: {db.query(Supplier).count()}")
        print(f"Employees: {db.query(Employee).count()}")
        print(f"Orders: {db.query(Order).count()}")
        print(f"YarnLots: {db.query(YarnLot).count()}")
        print(f"StockMovements: {db.query(StockMovement).count()}")
        print(f"WorkOrders: {db.query(WorkOrder).count()}")
        print(f"ProductionLogs: {db.query(ProductionLog).count()}")
        print(f"Rolls: {db.query(Roll).count()}")
        print(f"QCRecords: {db.query(QCRecord).count()}")
        print(f"Dispatches: {db.query(Dispatch).count()}")
        print(f"DispatchLines: {db.query(DispatchLine).count()}")
        print(f"Invoices: {db.query(Invoice).count()}")
        print(f"Payments: {db.query(Payment).count()}")
        print(f"SupplierBills: {db.query(SupplierBill).count()}")
        print(f"MachineDowntimes: {db.query(MachineDowntime).count()}")

    except Exception as e:
        db.rollback()
        print(f"ERROR during bulk seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    generate_dummy_data(target_count=400)
