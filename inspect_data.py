"""
Champions Club - Database Inspector & Live Data Viewer
Run this script to inspect live PostgreSQL database tables, counts, and sample records.
Usage:
    cd backend
    .venv\\Scripts\\python ..\\inspect_data.py
"""
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.database import SessionLocal
from app.models import (
    User, Role, Member, MemberSubscription,
    Court, Booking, SocialPlaySession,
    ProductCategory, Product, Order, OrderItem, InventoryMovement,
    BusinessClient, Invoice, InvoiceItem, Payment, PaymentAllocation, PaymentReceipt,
    Department, Designation, Employee, Attendance, LeaveRequest, SalaryStructure, SalaryAssignment
)

def inspect():
    db = SessionLocal()
    print("=" * 75)
    print("       CHAMPIONS CLUB SPORTS ERP — LIVE DATABASE AUDIT SUMMARY       ")
    print("=" * 75)
    print(f"Database Engine: PostgreSQL on localhost:5432 / champions_club")
    print("-" * 75)

    tables = [
        ("Users (Staff, Members, Clients)", User),
        ("Roles (RBAC System)", Role),
        ("Club Members", Member),
        ("Member Subscriptions", MemberSubscription),
        ("Sports Courts & Facilities", Court),
        ("Court Reservations & Bookings", Booking),
        ("Friday Social Play Sessions", SocialPlaySession),
        ("Product Categories", ProductCategory),
        ("Shop & Cafeteria Products", Product),
        ("Retail POS & Dining Orders", Order),
        ("Order Line Items", OrderItem),
        ("Inventory Stock Movements", InventoryMovement),
        ("Corporate Business Clients", BusinessClient),
        ("Invoices Ledger (B2B & Members)", Invoice),
        ("Invoice Line Items", InvoiceItem),
        ("Payments Received (Cash/Card/UPI)", Payment),
        ("Payment Allocations (Double-entry)", PaymentAllocation),
        ("Official Payment Receipts", PaymentReceipt),
        ("HR Departments", Department),
        ("HR Job Designations", Designation),
        ("Staff Employees", Employee),
        ("Daily Attendance Logs", Attendance),
        ("Leave Applications", LeaveRequest),
        ("Salary Compensation Structures", SalaryStructure),
        ("Base Salary Assignments", SalaryAssignment),
    ]

    print(f"{'DATABASE TABLE':<40} | {'ROW COUNT':<10} | {'STATUS'}")
    print("-" * 75)
    total_rows = 0
    for name, model in tables:
        try:
            count = db.query(model).count()
            total_rows += count
            status = "POPULATED" if count > 0 else "EMPTY"
            print(f"{name:<40} | {count:<10} | {status}")
        except Exception as e:
            print(f"{name:<40} | {'ERROR':<10} | {str(e)[:20]}")

    print("-" * 75)
    print(f"TOTAL SYSTEM RECORDS ACROSS 25 TABLES: {total_rows}")
    print("=" * 75)

    # 1. Sample Users & Roles
    print("\n[+] 1. SAMPLE USERS & RBAC ROLES:")
    users = db.query(User).limit(6).all()
    for u in users:
        roles_str = ", ".join([r.name for r in u.roles])
        print(f"    • {u.full_name:<20} | {u.email:<30} | Roles: [{roles_str}]")

    # 2. Sample Courts
    print("\n[+] 2. SPORTS FACILITIES & COURTS:")
    courts = db.query(Court).limit(5).all()
    for c in courts:
        print(f"    • {c.name:<25} | Sport: {c.sport_type:<10} | Rate: ₹{c.hourly_rate}/h (Walk-in: ₹{c.walk_in_rate}/h)")

    # 3. Sample Confirmed Bookings
    print("\n[+] 3. SAMPLE CONFIRMED COURT RESERVATIONS:")
    bookings = db.query(Booking).filter(Booking.status == "confirmed").limit(4).all()
    for b in bookings:
        booker = b.member.full_name if b.member else f"Walk-in: {b.walk_in_name}"
        c_name = b.court.name if b.court else "Court"
        time_str = b.start_time.strftime("%Y-%m-%d %H:%M UTC")
        print(f"    • {c_name:<22} | {time_str} | Booker: {booker:<20} | Fee: ₹{b.calculated_fee}")

    # 4. Sample Cafeteria & Shop Orders
    print("\n[+] 4. RETAIL POS & KITCHEN ORDERS:")
    orders = db.query(Order).limit(4).all()
    for o in orders:
        print(f"    • Order #{o.order_number:<16} | Type: {o.order_type:<10} | Status: {o.order_status:<10} | Total: ₹{o.total_amount}")

    # 5. Sample Financial Invoices & Payments
    print("\n[+] 5. FINANCIAL INVOICES & REVENUE SETTLEMENTS:")
    invoices = db.query(Invoice).limit(3).all()
    for inv in invoices:
        client_or_mem = inv.business_client.company_name if inv.business_client else (inv.member.full_name if inv.member else "Direct")
        print(f"    • Invoice #{inv.invoice_number:<16} | Bill To: {client_or_mem:<25} | Total: ₹{inv.total_amount} | Status: {inv.invoice_status}")

    print("\n" + "=" * 75)
    print("All data is stored in PostgreSQL database: champions_club")
    print("=" * 75 + "\n")
    db.close()

if __name__ == "__main__":
    inspect()
