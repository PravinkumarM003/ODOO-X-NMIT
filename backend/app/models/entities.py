from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    TypeDecorator,
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_id() -> str:
    return str(uuid.uuid4())

class PrismaDateTime(TypeDecorator):
    impl = Integer
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, datetime):
            return int(value.timestamp() * 1000)
        if isinstance(value, (int, float)):
            return int(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, (int, float)):
            if value > 1e11:
                return datetime.fromtimestamp(value / 1000.0, tz=timezone.utc)
            return datetime.fromtimestamp(value, tz=timezone.utc)
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value)
            except Exception:
                return datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc)
        return value

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    passwordHash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # OWNER, OFFICE, FLOOR, BUYER
    buyerId = Column(String, ForeignKey("Buyer.id"), nullable=True)
    createdAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc))

    buyer = relationship("Buyer", back_populates="users")

class Buyer(Base):
    __tablename__ = "Buyer"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    contactPerson = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)

    users = relationship("User", back_populates="buyer")
    orders = relationship("Order", back_populates="buyer")
    dispatches = relationship("Dispatch", back_populates="buyer")

class Supplier(Base):
    __tablename__ = "Supplier"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    contactPerson = Column(String, nullable=False)
    phone = Column(String, nullable=False)

    lots = relationship("YarnLot", back_populates="supplier")
    bills = relationship("SupplierBill", back_populates="supplier")

class FabricType(Base):
    __tablename__ = "FabricType"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    gsm = Column(Integer, nullable=False)
    widthCm = Column(Integer, nullable=False)
    yarnItemId = Column(String, ForeignKey("YarnItem.id"), nullable=False)
    yarnKgPerMetre = Column(Float, nullable=False)
    defaultPricePerMetre = Column(Float, nullable=False)

    yarnItem = relationship("YarnItem", back_populates="fabricTypes")
    orders = relationship("Order", back_populates="fabricType")

class YarnItem(Base):
    __tablename__ = "YarnItem"

    id = Column(String, primary_key=True, default=generate_id)
    code = Column(String, unique=True, nullable=False, index=True)
    yarnType = Column(String, nullable=False)
    count = Column(String, nullable=False)
    colour = Column(String, nullable=False)
    reorderThresholdKg = Column(Float, nullable=False)
    unit = Column(String, default="kg", nullable=False)

    fabricTypes = relationship("FabricType", back_populates="yarnItem")
    lots = relationship("YarnLot", back_populates="yarnItem")
    stockMovements = relationship("StockMovement", back_populates="yarnItem")

class YarnLot(Base):
    __tablename__ = "YarnLot"

    id = Column(String, primary_key=True, default=generate_id)
    lotCode = Column(String, unique=True, nullable=False, index=True)
    yarnItemId = Column(String, ForeignKey("YarnItem.id"), nullable=False)
    supplierId = Column(String, ForeignKey("Supplier.id"), nullable=False)
    receivedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    qtyReceivedKg = Column(Float, nullable=False)
    unitCostPerKg = Column(Float, nullable=False)
    linkedOrderId = Column(String, nullable=True)
    receivedBy = Column(String, nullable=False)

    yarnItem = relationship("YarnItem", back_populates="lots")
    supplier = relationship("Supplier", back_populates="lots")
    stockMovements = relationship("StockMovement", back_populates="lot")
    supplierBills = relationship("SupplierBill", back_populates="lot")

class StockMovement(Base):
    __tablename__ = "StockMovement"

    id = Column(String, primary_key=True, default=generate_id)
    yarnItemId = Column(String, ForeignKey("YarnItem.id"), nullable=False)
    lotId = Column(String, ForeignKey("YarnLot.id"), nullable=True)
    orderId = Column(String, ForeignKey("Order.id"), nullable=True)
    type = Column(String, nullable=False)  # RECEIPT, RESERVE, RELEASE, CONSUME, ADJUST
    qtyKg = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    createdBy = Column(String, nullable=False)
    createdAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    yarnItem = relationship("YarnItem", back_populates="stockMovements")
    lot = relationship("YarnLot", back_populates="stockMovements")
    order = relationship("Order", back_populates="stockMovements")

class Order(Base):
    __tablename__ = "Order"

    id = Column(String, primary_key=True, default=generate_id)
    orderNo = Column(String, unique=True, nullable=False, index=True)
    buyerId = Column(String, ForeignKey("Buyer.id"), nullable=False)
    fabricTypeId = Column(String, ForeignKey("FabricType.id"), nullable=False)
    colour = Column(String, nullable=False)
    qtyMetres = Column(Float, nullable=False)
    deadline = Column(PrismaDateTime, nullable=False)
    pricePerMetre = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    currentStage = Column(String, nullable=True)  # SPINNING, WEAVING, DYEING
    yarnRequiredKg = Column(Float, nullable=False)
    shortageKg = Column(Float, default=0.0, nullable=False)
    submittedByBuyer = Column(Boolean, default=False, nullable=False)
    reviewedBy = Column(String, nullable=True)
    reviewedAt = Column(PrismaDateTime, nullable=True)
    cancelReason = Column(String, nullable=True)
    cancelledAt = Column(PrismaDateTime, nullable=True)
    cancelledBy = Column(String, nullable=True)
    createdAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    createdBy = Column(String, nullable=False)

    buyer = relationship("Buyer", back_populates="orders")
    fabricType = relationship("FabricType", back_populates="orders")
    workOrders = relationship("WorkOrder", back_populates="order", cascade="all, delete-orphan")
    rolls = relationship("Roll", back_populates="order", cascade="all, delete-orphan")
    dispatches = relationship("Dispatch", back_populates="order")
    stockMovements = relationship("StockMovement", back_populates="order")
    invoices = relationship("Invoice", back_populates="order")

class Machine(Base):
    __tablename__ = "Machine"

    id = Column(String, primary_key=True, default=generate_id)
    code = Column(String, unique=True, nullable=False, index=True)
    type = Column(String, nullable=False)  # SPINNING, WEAVING, DYEING
    status = Column(String, nullable=False)  # RUNNING, IDLE, BREAKDOWN, MAINTENANCE
    hourlyRate = Column(Float, nullable=False)

    workOrders = relationship("WorkOrder", back_populates="machine")
    downtimes = relationship("MachineDowntime", back_populates="machine")
    weavingRolls = relationship("Roll", foreign_keys="Roll.weavingMachineId", back_populates="weavingMachine")
    dyeingRolls = relationship("Roll", foreign_keys="Roll.dyeingMachineId", back_populates="dyeingMachine")

class WorkOrder(Base):
    __tablename__ = "WorkOrder"

    id = Column(String, primary_key=True, default=generate_id)
    orderId = Column(String, ForeignKey("Order.id"), nullable=False)
    stage = Column(String, nullable=False)  # SPINNING, WEAVING, DYEING
    machineId = Column(String, ForeignKey("Machine.id"), nullable=True)
    plannedQtyMetres = Column(Float, nullable=False)
    producedQtyMetres = Column(Float, default=0.0, nullable=False)
    status = Column(String, nullable=False)  # NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED
    startedAt = Column(PrismaDateTime, nullable=True)
    completedAt = Column(PrismaDateTime, nullable=True)

    __table_args__ = (UniqueConstraint("orderId", "stage", name="_order_stage_uc"),)

    order = relationship("Order", back_populates="workOrders")
    machine = relationship("Machine", back_populates="workOrders")
    productionLogs = relationship("ProductionLog", back_populates="workOrder", cascade="all, delete-orphan")

class ProductionLog(Base):
    __tablename__ = "ProductionLog"

    id = Column(String, primary_key=True, default=generate_id)
    workOrderId = Column(String, ForeignKey("WorkOrder.id"), nullable=False)
    employeeId = Column(String, ForeignKey("Employee.id"), nullable=False)
    qtyMetres = Column(Float, nullable=False)
    hours = Column(Float, nullable=False)
    shift = Column(String, nullable=False)  # MORNING, EVENING, NIGHT
    loggedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    workOrder = relationship("WorkOrder", back_populates="productionLogs")
    employee = relationship("Employee", back_populates="productionLogs")

class MachineDowntime(Base):
    __tablename__ = "MachineDowntime"

    id = Column(String, primary_key=True, default=generate_id)
    machineId = Column(String, ForeignKey("Machine.id"), nullable=False)
    startedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    endedAt = Column(PrismaDateTime, nullable=True)
    reason = Column(String, nullable=False)

    machine = relationship("Machine", back_populates="downtimes")

class Roll(Base):
    __tablename__ = "Roll"

    id = Column(String, primary_key=True, default=generate_id)
    rollNo = Column(String, unique=True, nullable=False, index=True)
    orderId = Column(String, ForeignKey("Order.id"), nullable=False)
    weavingMachineId = Column(String, ForeignKey("Machine.id"), nullable=True)
    dyeingMachineId = Column(String, ForeignKey("Machine.id"), nullable=True)
    lengthMetres = Column(Float, nullable=False)
    qcStatus = Column(String, nullable=False)  # PENDING, PASSED, REWORK, REJECTED
    stockStatus = Column(String, nullable=False)  # IN_STORE, DISPATCHED
    createdAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="rolls")
    weavingMachine = relationship("Machine", foreign_keys=[weavingMachineId], back_populates="weavingRolls")
    dyeingMachine = relationship("Machine", foreign_keys=[dyeingMachineId], back_populates="dyeingRolls")
    qcRecords = relationship("QCRecord", back_populates="roll", cascade="all, delete-orphan")
    dispatchLine = relationship("DispatchLine", back_populates="roll", uselist=False)

class QCRecord(Base):
    __tablename__ = "QCRecord"

    id = Column(String, primary_key=True, default=generate_id)
    qcNo = Column(String, nullable=False)
    rollId = Column(String, ForeignKey("Roll.id"), nullable=False)
    inspectorId = Column(String, nullable=True)
    inspectorName = Column(String, nullable=True)
    result = Column(String, nullable=False)  # PASSED, REWORK, REJECTED
    defectType = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    createdAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    roll = relationship("Roll", back_populates="qcRecords")

class Dispatch(Base):
    __tablename__ = "Dispatch"

    id = Column(String, primary_key=True, default=generate_id)
    dispatchNo = Column(String, unique=True, nullable=False, index=True)
    orderId = Column(String, ForeignKey("Order.id"), nullable=False)
    buyerId = Column(String, ForeignKey("Buyer.id"), nullable=False)
    truckNo = Column(String, nullable=False)
    driverName = Column(String, nullable=False)
    dispatchedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    dispatchedBy = Column(String, nullable=False)

    order = relationship("Order", back_populates="dispatches")
    buyer = relationship("Buyer", back_populates="dispatches")
    lines = relationship("DispatchLine", back_populates="dispatch", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="dispatch", uselist=False)

class DispatchLine(Base):
    __tablename__ = "DispatchLine"

    id = Column(String, primary_key=True, default=generate_id)
    dispatchId = Column(String, ForeignKey("Dispatch.id"), nullable=False)
    rollId = Column(String, ForeignKey("Roll.id"), unique=True, nullable=False)
    lengthMetres = Column(Float, nullable=False)

    dispatch = relationship("Dispatch", back_populates="lines")
    roll = relationship("Roll", back_populates="dispatchLine")

class Invoice(Base):
    __tablename__ = "Invoice"

    id = Column(String, primary_key=True, default=generate_id)
    invoiceNo = Column(String, unique=True, nullable=False, index=True)
    orderId = Column(String, ForeignKey("Order.id"), nullable=False)
    dispatchId = Column(String, ForeignKey("Dispatch.id"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    issuedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String, nullable=False)  # UNPAID, PARTIAL, PAID

    order = relationship("Order", back_populates="invoices")
    dispatch = relationship("Dispatch", back_populates="invoice")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "Payment"

    id = Column(String, primary_key=True, default=generate_id)
    invoiceId = Column(String, ForeignKey("Invoice.id"), nullable=False)
    amount = Column(Float, nullable=False)
    receivedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    method = Column(String, nullable=False)  # BANK, CASH, UPI
    reference = Column(String, nullable=True)

    invoice = relationship("Invoice", back_populates="payments")

class SupplierBill(Base):
    __tablename__ = "SupplierBill"

    id = Column(String, primary_key=True, default=generate_id)
    billNo = Column(String, unique=True, nullable=False, index=True)
    supplierId = Column(String, ForeignKey("Supplier.id"), nullable=False)
    lotId = Column(String, ForeignKey("YarnLot.id"), nullable=True)
    amount = Column(Float, nullable=False)
    billedAt = Column(PrismaDateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String, nullable=False)  # UNPAID, PAID
    paidAt = Column(PrismaDateTime, nullable=True)

    supplier = relationship("Supplier", back_populates="bills")
    lot = relationship("YarnLot", back_populates="supplierBills")

class Employee(Base):
    __tablename__ = "Employee"

    id = Column(String, primary_key=True, default=generate_id)
    empNo = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    jobTitle = Column(String, nullable=False)
    dailyWage = Column(Float, nullable=False)
    overtimeRatePerHour = Column(Float, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    productionLogs = relationship("ProductionLog", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")
    wageSummaries = relationship("WageSummary", back_populates="employee")

class Attendance(Base):
    __tablename__ = "Attendance"

    id = Column(String, primary_key=True, default=generate_id)
    employeeId = Column(String, ForeignKey("Employee.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    shift = Column(String, nullable=False)  # MORNING, EVENING, NIGHT
    status = Column(String, nullable=False)  # PRESENT, ABSENT, LEAVE
    overtimeHours = Column(Float, default=0.0, nullable=False)

    __table_args__ = (UniqueConstraint("employeeId", "date", name="_employee_date_uc"),)

    employee = relationship("Employee", back_populates="attendances")

class WageSummary(Base):
    __tablename__ = "WageSummary"

    id = Column(String, primary_key=True, default=generate_id)
    employeeId = Column(String, ForeignKey("Employee.id"), nullable=False)
    month = Column(String, nullable=False)  # YYYY-MM
    daysPresent = Column(Integer, nullable=False)
    overtimeHours = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    closedAt = Column(PrismaDateTime, nullable=False)
    closedBy = Column(String, nullable=False)
    paidAt = Column(PrismaDateTime, nullable=True)
    paidAmount = Column(Float, nullable=True)
    paymentMethod = Column(String, nullable=True)
    paymentReference = Column(String, nullable=True)

    __table_args__ = (UniqueConstraint("employeeId", "month", name="_employee_month_uc"),)

    employee = relationship("Employee", back_populates="wageSummaries")
