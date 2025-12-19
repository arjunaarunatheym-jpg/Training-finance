# Finance Portal API Routes
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME')
db = client[db_name]

finance_router = APIRouter(prefix="/finance", tags=["Finance"])

# Import helper functions from main server
from server import (
    get_current_user, User, get_malaysia_time,
    Invoice, InvoiceUpdate, Payment, PaymentCreate,
    MarketingCommission, MarketingCommissionCreate,
    TrainerIncome, CoordinatorFee, FinanceAuditLog
)

# ============ INVOICE NUMBER GENERATION ============

async def generate_invoice_number():
    """Generate unique invoice number: INV-YYYY-NNNN"""
    year = get_malaysia_time().year
    prefix = f"INV-{year}-"
    
    # Find the highest invoice number for this year
    last_invoice = await db.invoices.find_one(
        {"invoice_number": {"$regex": f"^{prefix}"}},
        sort=[("invoice_number", -1)]
    )
    
    if last_invoice:
        last_num = int(last_invoice["invoice_number"].split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"

# ============ AUDIT LOGGING ============

async def log_finance_action(entity_type: str, entity_id: str, action: str, 
                             changed_by: str, before_value: dict = None, 
                             after_value: dict = None, reason: str = None):
    """Log all finance-related actions for audit trail"""
    log_entry = {
        "id": str(__import__('uuid').uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "before_value": before_value,
        "after_value": after_value,
        "changed_by": changed_by,
        "reason": reason,
        "timestamp": get_malaysia_time().isoformat()
    }
    await db.finance_audit_log.insert_one(log_entry)

# ============ AUTO-INVOICE CREATION ============

async def create_auto_invoice_for_session(session_data: dict, created_by: str):
    """Auto-generate draft invoice when training session is created"""
    invoice_number = await generate_invoice_number()
    
    # Get company and programme info
    company = await db.companies.find_one({"id": session_data.get("company_id")}, {"_id": 0})
    programme = await db.programs.find_one({"id": session_data.get("program_id")}, {"_id": 0})
    
    invoice = {
        "id": str(__import__('uuid').uuid4()),
        "invoice_number": invoice_number,
        "session_id": session_data.get("id"),
        "company_id": session_data.get("company_id"),
        "company_name": company.get("name") if company else None,
        "programme_name": programme.get("name") if programme else None,
        "training_dates": f"{session_data.get('start_date')} to {session_data.get('end_date')}",
        "venue": session_data.get("location"),
        "pax": len(session_data.get("participant_ids", [])),
        "line_items": [],
        "subtotal": 0.0,
        "tax_rate": 0.0,
        "tax_amount": 0.0,
        "total_amount": 0.0,
        "status": "auto_draft",
        "created_at": get_malaysia_time().isoformat(),
        "updated_at": get_malaysia_time().isoformat(),
        "version": 1
    }
    
    await db.invoices.insert_one(invoice)
    
    # Log the creation
    await log_finance_action(
        entity_type="invoice",
        entity_id=invoice["id"],
        action="created",
        changed_by=created_by,
        after_value=invoice
    )
    
    # Update session with invoice reference
    await db.sessions.update_one(
        {"id": session_data.get("id")},
        {"$set": {
            "invoice_id": invoice["id"],
            "invoice_number": invoice_number,
            "invoice_status": "auto_draft"
        }}
    )
    
    return invoice

# ============ INVOICE ENDPOINTS ============

@finance_router.get("/invoices")
async def get_invoices(
    status: Optional[str] = None,
    company_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all invoices (Finance and Admin only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if status:
        query["status"] = status
    if company_id:
        query["company_id"] = company_id
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices

@finance_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    """Get single invoice details"""
    if current_user.role not in ["admin", "super_admin", "finance", "coordinator"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@finance_router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    update_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update invoice (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can update invoices")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Cannot modify issued/paid invoices without revision
    if invoice.get("status") in ["issued", "paid"]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot modify issued/paid invoice. Create a revision instead."
        )
    
    before_value = dict(invoice)
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = get_malaysia_time().isoformat()
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_dict})
    
    # Update session invoice status if status changed
    if "status" in update_dict:
        await db.sessions.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"invoice_status": update_dict["status"]}}
        )
    
    # Log the update
    await log_finance_action(
        entity_type="invoice",
        entity_id=invoice_id,
        action="updated",
        changed_by=current_user.id,
        before_value=before_value,
        after_value=update_dict
    )
    
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated

@finance_router.post("/invoices/{invoice_id}/approve")
async def approve_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    """Approve invoice (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can approve invoices")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") not in ["auto_draft", "finance_review"]:
        raise HTTPException(status_code=400, detail="Invoice cannot be approved from current status")
    
    before_value = dict(invoice)
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "approved",
            "approved_by": current_user.id,
            "approved_at": get_malaysia_time().isoformat(),
            "updated_at": get_malaysia_time().isoformat()
        }}
    )
    
    await db.sessions.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"invoice_status": "approved"}}
    )
    
    await log_finance_action(
        entity_type="invoice",
        entity_id=invoice_id,
        action="status_changed",
        changed_by=current_user.id,
        before_value={"status": before_value.get("status")},
        after_value={"status": "approved"}
    )
    
    return {"message": "Invoice approved successfully"}

@finance_router.post("/invoices/{invoice_id}/issue")
async def issue_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    """Issue invoice (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can issue invoices")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved invoices can be issued")
    
    before_value = dict(invoice)
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "issued",
            "issued_by": current_user.id,
            "issued_at": get_malaysia_time().isoformat(),
            "updated_at": get_malaysia_time().isoformat()
        }}
    )
    
    await db.sessions.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"invoice_status": "issued"}}
    )
    
    # Calculate and finalize marketing commission if exists
    session = await db.sessions.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if session and session.get("marketing_user_id"):
        commission_amount = 0.0
        if session.get("commission_type") == "percentage":
            commission_amount = invoice.get("total_amount", 0) * (session.get("commission_rate", 0) / 100)
        else:
            commission_amount = session.get("commission_fixed_amount", 0)
        
        # Update or create marketing commission record
        await db.marketing_commissions.update_one(
            {"session_id": session["id"]},
            {"$set": {
                "calculated_amount": commission_amount,
                "invoice_id": invoice_id,
                "status": "approved",
                "updated_at": get_malaysia_time().isoformat()
            }},
            upsert=True
        )
    
    await log_finance_action(
        entity_type="invoice",
        entity_id=invoice_id,
        action="status_changed",
        changed_by=current_user.id,
        before_value={"status": before_value.get("status")},
        after_value={"status": "issued"}
    )
    
    return {"message": "Invoice issued successfully"}

@finance_router.post("/invoices/{invoice_id}/cancel")
async def cancel_invoice(
    invoice_id: str, 
    reason: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel invoice (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can cancel invoices")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    before_value = dict(invoice)
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_by": current_user.id,
            "cancelled_at": get_malaysia_time().isoformat(),
            "cancellation_reason": reason,
            "updated_at": get_malaysia_time().isoformat()
        }}
    )
    
    await db.sessions.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"invoice_status": "cancelled"}}
    )
    
    await log_finance_action(
        entity_type="invoice",
        entity_id=invoice_id,
        action="status_changed",
        changed_by=current_user.id,
        before_value={"status": before_value.get("status")},
        after_value={"status": "cancelled", "reason": reason},
        reason=reason
    )
    
    return {"message": "Invoice cancelled successfully"}

# ============ PAYMENT ENDPOINTS ============

@finance_router.post("/payments")
async def record_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    """Record a payment against an invoice (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can record payments")
    
    invoice = await db.invoices.find_one({"id": payment_data.invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") not in ["issued", "paid"]:
        raise HTTPException(status_code=400, detail="Can only record payments for issued invoices")
    
    payment = {
        "id": str(__import__('uuid').uuid4()),
        "invoice_id": payment_data.invoice_id,
        "amount": payment_data.amount,
        "payment_date": payment_data.payment_date,
        "payment_method": payment_data.payment_method,
        "reference_number": payment_data.reference_number,
        "notes": payment_data.notes,
        "recorded_by": current_user.id,
        "created_at": get_malaysia_time().isoformat()
    }
    
    await db.payments.insert_one(payment)
    
    # Check if invoice is fully paid
    all_payments = await db.payments.find({"invoice_id": payment_data.invoice_id}, {"_id": 0}).to_list(100)
    total_paid = sum(p.get("amount", 0) for p in all_payments)
    
    if total_paid >= invoice.get("total_amount", 0):
        await db.invoices.update_one(
            {"id": payment_data.invoice_id},
            {"$set": {"status": "paid", "updated_at": get_malaysia_time().isoformat()}}
        )
        await db.sessions.update_one(
            {"invoice_id": payment_data.invoice_id},
            {"$set": {"invoice_status": "paid"}}
        )
    
    await log_finance_action(
        entity_type="payment",
        entity_id=payment["id"],
        action="created",
        changed_by=current_user.id,
        after_value=payment
    )
    
    return payment

@finance_router.get("/payments")
async def get_payments(
    invoice_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get payments (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

# ============ INCOME DASHBOARD ENDPOINTS ============

@finance_router.get("/income/trainer/{trainer_id}")
async def get_trainer_income(
    trainer_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Get trainer income summary"""
    # Trainers can only view their own income
    if current_user.role == "trainer" and current_user.id != trainer_id:
        raise HTTPException(status_code=403, detail="Can only view your own income")
    
    if current_user.role not in ["admin", "super_admin", "finance", "trainer"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"trainer_id": trainer_id}
    
    income_records = await db.trainer_income.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with session details
    for record in income_records:
        session = await db.sessions.find_one({"id": record.get("session_id")}, {"_id": 0, "name": 1, "start_date": 1, "end_date": 1})
        if session:
            record["session_name"] = session.get("name")
            record["training_dates"] = f"{session.get('start_date')} to {session.get('end_date')}"
    
    # Calculate summary
    total_income = sum(r.get("amount", 0) for r in income_records)
    paid_income = sum(r.get("amount", 0) for r in income_records if r.get("status") == "paid")
    pending_income = total_income - paid_income
    
    return {
        "records": income_records,
        "summary": {
            "total_income": total_income,
            "paid_income": paid_income,
            "pending_income": pending_income
        }
    }

@finance_router.get("/income/coordinator/{coordinator_id}")
async def get_coordinator_income(
    coordinator_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Get coordinator fee summary"""
    # Coordinators can only view their own income
    if current_user.role == "coordinator" and current_user.id != coordinator_id:
        raise HTTPException(status_code=403, detail="Can only view your own income")
    
    if current_user.role not in ["admin", "super_admin", "finance", "coordinator"]:
        # Check additional_roles
        if "coordinator" not in current_user.additional_roles:
            raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"coordinator_id": coordinator_id}
    
    fee_records = await db.coordinator_fees.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with session details
    for record in fee_records:
        session = await db.sessions.find_one({"id": record.get("session_id")}, {"_id": 0, "name": 1, "start_date": 1, "end_date": 1})
        if session:
            record["session_name"] = session.get("name")
            record["training_dates"] = f"{session.get('start_date')} to {session.get('end_date')}"
    
    # Calculate summary
    total_fees = sum(r.get("amount", 0) for r in fee_records)
    paid_fees = sum(r.get("amount", 0) for r in fee_records if r.get("status") == "paid")
    pending_fees = total_fees - paid_fees
    
    return {
        "records": fee_records,
        "summary": {
            "total_fees": total_fees,
            "paid_fees": paid_fees,
            "pending_fees": pending_fees
        }
    }

@finance_router.get("/income/marketing/{marketing_id}")
async def get_marketing_income(
    marketing_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Get marketing commission summary"""
    # Marketing can only view their own income
    is_marketing = current_user.role == "marketing" or "marketing" in (current_user.additional_roles or [])
    
    if is_marketing and current_user.id != marketing_id:
        raise HTTPException(status_code=403, detail="Can only view your own income")
    
    if current_user.role not in ["admin", "super_admin", "finance", "marketing"]:
        if "marketing" not in (current_user.additional_roles or []):
            raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"marketing_user_id": marketing_id}
    
    commission_records = await db.marketing_commissions.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with session details
    for record in commission_records:
        session = await db.sessions.find_one({"id": record.get("session_id")}, {"_id": 0, "name": 1, "start_date": 1, "end_date": 1, "company_id": 1})
        if session:
            record["session_name"] = session.get("name")
            record["training_dates"] = f"{session.get('start_date')} to {session.get('end_date')}"
            company = await db.companies.find_one({"id": session.get("company_id")}, {"_id": 0, "name": 1})
            record["company_name"] = company.get("name") if company else None
    
    # Calculate summary
    total_commission = sum(r.get("calculated_amount", 0) for r in commission_records)
    paid_commission = sum(r.get("calculated_amount", 0) for r in commission_records if r.get("status") == "paid")
    pending_commission = total_commission - paid_commission
    
    return {
        "records": commission_records,
        "summary": {
            "total_commission": total_commission,
            "paid_commission": paid_commission,
            "pending_commission": pending_commission
        }
    }

# ============ MARKETING USERS LIST ============

@finance_router.get("/marketing-users")
async def get_marketing_users(current_user: User = Depends(get_current_user)):
    """Get list of users who have marketing role or additional_role"""
    if current_user.role not in ["admin", "super_admin", "finance", "coordinator"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find users with marketing as primary role OR in additional_roles
    marketing_users = await db.users.find(
        {
            "$or": [
                {"role": "marketing"},
                {"additional_roles": "marketing"}
            ]
        },
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "additional_roles": 1}
    ).to_list(100)
    
    return marketing_users

# ============ FINANCE DASHBOARD ============

@finance_router.get("/dashboard")
async def get_finance_dashboard(current_user: User = Depends(get_current_user)):
    """Get finance dashboard summary"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Invoice stats
    total_invoices = await db.invoices.count_documents({})
    draft_invoices = await db.invoices.count_documents({"status": {"$in": ["auto_draft", "finance_review"]}})
    approved_invoices = await db.invoices.count_documents({"status": "approved"})
    issued_invoices = await db.invoices.count_documents({"status": "issued"})
    paid_invoices = await db.invoices.count_documents({"status": "paid"})
    
    # Financial totals
    all_invoices = await db.invoices.find({"status": {"$in": ["issued", "paid"]}}, {"_id": 0, "total_amount": 1, "status": 1}).to_list(1000)
    total_issued_amount = sum(inv.get("total_amount", 0) for inv in all_invoices)
    total_collected = sum(inv.get("total_amount", 0) for inv in all_invoices if inv.get("status") == "paid")
    outstanding = total_issued_amount - total_collected
    
    # Pending payables
    pending_trainer_income = await db.trainer_income.find({"status": "pending"}, {"_id": 0, "amount": 1}).to_list(1000)
    pending_coordinator_fees = await db.coordinator_fees.find({"status": "pending"}, {"_id": 0, "amount": 1}).to_list(1000)
    pending_commissions = await db.marketing_commissions.find({"status": {"$in": ["pending", "approved"]}}, {"_id": 0, "calculated_amount": 1}).to_list(1000)
    
    total_pending_payables = (
        sum(r.get("amount", 0) for r in pending_trainer_income) +
        sum(r.get("amount", 0) for r in pending_coordinator_fees) +
        sum(r.get("calculated_amount", 0) for r in pending_commissions)
    )
    
    return {
        "invoices": {
            "total": total_invoices,
            "draft": draft_invoices,
            "approved": approved_invoices,
            "issued": issued_invoices,
            "paid": paid_invoices
        },
        "financials": {
            "total_issued": total_issued_amount,
            "total_collected": total_collected,
            "outstanding_receivables": outstanding
        },
        "payables": {
            "pending_total": total_pending_payables
        }
    }

# ============ AUDIT LOG ============

@finance_router.get("/audit-log")
async def get_audit_log(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get finance audit log (Finance and Admin only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.finance_audit_log.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    # Enrich with user names
    for log in logs:
        user = await db.users.find_one({"id": log.get("changed_by")}, {"_id": 0, "full_name": 1})
        log["changed_by_name"] = user.get("full_name") if user else "Unknown"
    
    return logs

# ============ MARK PAYMENTS AS PAID ============

@finance_router.post("/income/trainer/{record_id}/mark-paid")
async def mark_trainer_income_paid(
    record_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark trainer income as paid (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can mark payments")
    
    record = await db.trainer_income.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await db.trainer_income.update_one(
        {"id": record_id},
        {"$set": {
            "status": "paid",
            "paid_date": get_malaysia_time().strftime("%Y-%m-%d"),
            "paid_by": current_user.id
        }}
    )
    
    await log_finance_action(
        entity_type="trainer_income",
        entity_id=record_id,
        action="status_changed",
        changed_by=current_user.id,
        before_value={"status": record.get("status")},
        after_value={"status": "paid"}
    )
    
    return {"message": "Marked as paid"}

@finance_router.post("/income/coordinator/{record_id}/mark-paid")
async def mark_coordinator_fee_paid(
    record_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark coordinator fee as paid (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can mark payments")
    
    record = await db.coordinator_fees.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await db.coordinator_fees.update_one(
        {"id": record_id},
        {"$set": {
            "status": "paid",
            "paid_date": get_malaysia_time().strftime("%Y-%m-%d"),
            "paid_by": current_user.id
        }}
    )
    
    await log_finance_action(
        entity_type="coordinator_fee",
        entity_id=record_id,
        action="status_changed",
        changed_by=current_user.id,
        before_value={"status": record.get("status")},
        after_value={"status": "paid"}
    )
    
    return {"message": "Marked as paid"}

@finance_router.post("/income/commission/{record_id}/mark-paid")
async def mark_commission_paid(
    record_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark marketing commission as paid (Finance only)"""
    if current_user.role not in ["admin", "super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Only Finance can mark payments")
    
    record = await db.marketing_commissions.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await db.marketing_commissions.update_one(
        {"id": record_id},
        {"$set": {
            "status": "paid",
            "paid_date": get_malaysia_time().strftime("%Y-%m-%d"),
            "paid_by": current_user.id,
            "updated_at": get_malaysia_time().isoformat()
        }}
    )
    
    await log_finance_action(
        entity_type="marketing_commission",
        entity_id=record_id,
        action="status_changed",
        changed_by=current_user.id,
        before_value={"status": record.get("status")},
        after_value={"status": "paid"}
    )
    
    return {"message": "Marked as paid"}
