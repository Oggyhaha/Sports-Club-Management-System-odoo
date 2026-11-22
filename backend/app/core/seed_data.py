"""
Champions Club — Comprehensive Database Seed Script
Populates the development database with:
- All 8 canonical roles
- Demo user accounts for every role (password: Champions2026!)
- Active membership plans (Gold, Silver, Junior)
- Multi-sport facilities / courts (Badminton, Tennis, Squash, Table Tennis)
- Pro-Shop categories, products, and inventory stock
- Cafeteria menu offerings
- HR departments, designations, and employees
- Corporate business client with sample B2B invoices
- Scheduled Friday social play mixer sessions

Idempotent: Safe to execute repeatedly without duplicating records.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import uuid

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Role,
    RoleEnum,
    User,
    MembershipPlan,
    Member,
    MemberSubscription,
    Court,
    ProductCategory,
    Product,
    InventoryMovement,
    BusinessClient,
    Invoice,
    InvoiceItem,
    Payment,
    PaymentAllocation,
    Department,
    Designation,
    Employee,
    SocialPlaySession,
)


def seed_all():
    db: Session = SessionLocal()
    print("=" * 60)
    print("Starting Champions Club Comprehensive Data Seeding...")
    print("=" * 60)

    try:
        # -------------------------------------------------------------
        # 1. Canonical Roles
        # -------------------------------------------------------------
        roles_data = [
            {"name": "owner", "description": "Club Owner with full administrative privileges"},
            {"name": "receptionist", "description": "Front-desk receptionist managing members and bookings"},
            {"name": "member", "description": "Club member with self-service court and shop access"},
            {"name": "shop_staff", "description": "Pro-shop staff managing retail and inventory"},
            {"name": "cafeteria_staff", "description": "Cafeteria staff managing dining and kitchen orders"},
            {"name": "hr_staff", "description": "HR staff managing workforce, attendance, and payroll"},
            {"name": "account_staff", "description": "Finance staff managing accounts receivable and billing"},
            {"name": "business_client", "description": "Corporate client managing institutional accounts"},
        ]

        roles_map = {}
        for r_item in roles_data:
            role = db.query(Role).filter(Role.name == r_item["name"]).first()
            if not role:
                role = Role(**r_item)
                db.add(role)
                db.flush()
                print(f"[+] Created Role: {role.name}")
            roles_map[role.name] = role

        # -------------------------------------------------------------
        # 2. Membership Plans
        # -------------------------------------------------------------
        plans_data = [
            {
                "name": "Gold",
                "monthly_fee": Decimal("100.00"),
                "court_discount_percent": Decimal("50.00"),
                "shop_discount_percent": Decimal("20.00"),
                "bar_discount_percent": Decimal("15.00"),
                "duration_days": 30,
                "description": "Premium All-Access: 50% off court reservations, 20% pro-shop discount, 15% cafeteria discount.",
                "is_active": True,
            },
            {
                "name": "Silver",
                "monthly_fee": Decimal("50.00"),
                "court_discount_percent": Decimal("20.00"),
                "shop_discount_percent": Decimal("10.00"),
                "bar_discount_percent": Decimal("5.00"),
                "duration_days": 30,
                "description": "Standard Access: 20% off court reservations and 10% pro-shop gear discount.",
                "is_active": True,
            },
            {
                "name": "Junior",
                "monthly_fee": Decimal("25.00"),
                "court_discount_percent": Decimal("30.00"),
                "shop_discount_percent": Decimal("15.00"),
                "bar_discount_percent": Decimal("10.00"),
                "duration_days": 30,
                "description": "Under-18 Developmental: 30% off court bookings for youth athletes.",
                "is_active": True,
            },
        ]

        plans_map = {}
        for p_item in plans_data:
            plan = db.query(MembershipPlan).filter(MembershipPlan.name == p_item["name"]).first()
            if not plan:
                plan = MembershipPlan(**p_item)
                db.add(plan)
                db.flush()
                print(f"[+] Created Plan: {plan.name}")
            else:
                # Update discounts and duration if needed
                plan.court_discount_percent = p_item["court_discount_percent"]
                plan.shop_discount_percent = p_item["shop_discount_percent"]
                plan.bar_discount_percent = p_item["bar_discount_percent"]
                plan.duration_days = p_item["duration_days"]
                plan.is_active = True
            plans_map[plan.name] = plan

        # -------------------------------------------------------------
        # 3. Sports Courts
        # -------------------------------------------------------------
        courts_data = [
            {"name": "Badminton Court 1", "sport_type": "badminton", "hourly_rate": Decimal("400.00"), "is_active": True},
            {"name": "Badminton Court 2", "sport_type": "badminton", "hourly_rate": Decimal("400.00"), "is_active": True},
            {"name": "Tennis Court 1", "sport_type": "tennis", "hourly_rate": Decimal("600.00"), "is_active": True},
            {"name": "Tennis Court 2", "sport_type": "tennis", "hourly_rate": Decimal("600.00"), "is_active": True},
            {"name": "Squash Court 1", "sport_type": "squash", "hourly_rate": Decimal("500.00"), "is_active": True},
            {"name": "Table Tennis Arena", "sport_type": "table_tennis", "hourly_rate": Decimal("300.00"), "is_active": True},
        ]

        for c_item in courts_data:
            court = db.query(Court).filter(Court.name == c_item["name"]).first()
            if not court:
                court = Court(**c_item)
                db.add(court)
                print(f"[+] Created Court: {court.name}")
            else:
                court.is_active = True
                court.hourly_rate = c_item["hourly_rate"]
        db.flush()

        # -------------------------------------------------------------
        # 4. Demo Users Across All 8 Roles
        # -------------------------------------------------------------
        default_pwd = hash_password("Champions2026!")

        users_data = [
            {
                "email": "owner@championsclub.com",
                "full_name": "Arjun Mehta",
                "phone": "+91 98765 00001",
                "role": "owner",
            },
            {
                "email": "receptionist@championsclub.com",
                "full_name": "Priya Sharma",
                "phone": "+91 98765 00002",
                "role": "receptionist",
            },
            {
                "email": "member@championsclub.com",
                "full_name": "Virat Kohli",
                "phone": "+91 98765 00003",
                "role": "member",
                "is_subscribed": True,
            },
            {
                "email": "prospective@championsclub.com",
                "full_name": "Aarav Patel",
                "phone": "+91 98765 00004",
                "role": "member",
                "is_subscribed": False,  # No active subscription (Prospective Member)
            },
            {
                "email": "kartik@gmail.com",
                "full_name": "Kartik Rana",
                "phone": "+91 98765 00005",
                "role": "member",
                "is_subscribed": True,
            },
            {
                "email": "shop@championsclub.com",
                "full_name": "Ramesh Kumar",
                "phone": "+91 98765 00006",
                "role": "shop_staff",
            },
            {
                "email": "cafeteria@championsclub.com",
                "full_name": "Chef Sanjeev",
                "phone": "+91 98765 00007",
                "role": "cafeteria_staff",
            },
            {
                "email": "hr@championsclub.com",
                "full_name": "Ananya Iyer",
                "phone": "+91 98765 00008",
                "role": "hr_staff",
            },
            {
                "email": "finance@championsclub.com",
                "full_name": "Vikram Singhania",
                "phone": "+91 98765 00009",
                "role": "account_staff",
            },
            {
                "email": "corporate@techcorp.com",
                "full_name": "Rajesh Sharma",
                "phone": "+91 98765 00010",
                "role": "business_client",
            },
        ]

        users_map = {}
        for u_item in users_data:
            user = db.query(User).filter(User.email == u_item["email"]).first()
            target_role = roles_map[u_item["role"]]
            if not user:
                user = User(
                    email=u_item["email"],
                    hashed_password=default_pwd,
                    full_name=u_item["full_name"],
                    phone=u_item["phone"],
                    is_active=True,
                    token_version=1,
                )
                user.roles.append(target_role)
                db.add(user)
                db.flush()
                print(f"[+] Created User: {user.email} [{u_item['role']}]")
            else:
                user.full_name = u_item["full_name"]
                user.is_active = True
                user.hashed_password = default_pwd
                if target_role not in user.roles:
                    user.roles.append(target_role)
            users_map[user.email] = user

            # Link Member profile if subscribed
            if u_item.get("is_subscribed"):
                gold_plan = plans_map["Gold"]
                member = db.query(Member).filter(Member.user_id == user.id).first()
                if not member:
                    member = Member(
                        user_id=user.id,
                        full_name=user.full_name,
                        email=user.email,
                        phone=user.phone,
                        plan_id=gold_plan.id,
                        start_date=date.today() - timedelta(days=5),
                        expiry_date=date.today() + timedelta(days=25),
                        is_active=True,
                    )
                    db.add(member)
                    db.flush()
                    print(f"  [+] Linked Active Member Profile for: {user.email}")

                # Ensure active subscription record
                sub = db.query(MemberSubscription).filter(MemberSubscription.member_id == member.id).first()
                if not sub:
                    sub = MemberSubscription(
                        member_id=member.id,
                        plan_id=gold_plan.id,
                        start_date=date.today() - timedelta(days=5),
                        end_date=date.today() + timedelta(days=25),
                        price_paid=gold_plan.monthly_fee,
                        plan_name_snapshot=gold_plan.name,
                        duration_days_snapshot=30,
                        court_discount_snapshot=gold_plan.court_discount_percent,
                        shop_discount_snapshot=gold_plan.shop_discount_percent,
                        bar_discount_snapshot=gold_plan.bar_discount_percent,
                        subscription_status="active",
                        payment_status="paid",
                    )
                    db.add(sub)
                    db.flush()

        # -------------------------------------------------------------
        # 5. Corporate Business Client
        # -------------------------------------------------------------
        corp_user = users_map["corporate@techcorp.com"]
        corp_client = db.query(BusinessClient).filter(BusinessClient.user_id == corp_user.id).first()
        if not corp_client:
            corp_client = BusinessClient(
                user_id=corp_user.id,
                company_name="TechCorp Solutions Pvt Ltd",
                contact_person="Rajesh Sharma",
                email="corporate@techcorp.com",
                phone="+91 98765 00010",
                tax_id_gstin="29AABCT1332L1Z1",
                billing_address="Prestige Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103",
                is_active=True,
            )
            db.add(corp_client)
            db.flush()
            print("[+] Created Corporate Business Client: TechCorp Solutions")

            # Create sample B2B Invoices for TechCorp
            inv1 = Invoice(
                business_client_id=corp_client.id,
                invoice_number="CORP-2026-0001",
                issue_date=date.today() - timedelta(days=15),
                due_date=date.today() + timedelta(days=15),
                subtotal=Decimal("50000.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("9000.00"),
                total_amount=Decimal("59000.00"),
                amount_paid=Decimal("59000.00"),
                invoice_status="paid",
                notes="Annual Corporate Badminton Arena Block (50 hours)",
            )
            db.add(inv1)
            db.flush()

            db.add(InvoiceItem(
                invoice_id=inv1.id,
                description="Badminton Arena Exclusive Block (50 Hours)",
                quantity=Decimal("50.00"),
                unit_price=Decimal("1000.00"),
                line_total=Decimal("50000.00"),
            ))

            inv2 = Invoice(
                business_client_id=corp_client.id,
                invoice_number="CORP-2026-0002",
                issue_date=date.today() - timedelta(days=3),
                due_date=date.today() + timedelta(days=27),
                subtotal=Decimal("25000.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("4500.00"),
                total_amount=Decimal("29500.00"),
                amount_paid=Decimal("10000.00"),
                invoice_status="partially_paid",
                notes="Inter-Company Squash Tournament Sponsorship & Court Block",
            )
            db.add(inv2)
            db.flush()

            db.add(InvoiceItem(
                invoice_id=inv2.id,
                description="Squash Court Block & Tournament Logistics",
                quantity=Decimal("25.00"),
                unit_price=Decimal("1000.00"),
                line_total=Decimal("25000.00"),
            ))
            print("[+] Seeded Corporate Invoices for TechCorp")

        # -------------------------------------------------------------
        # 6. Pro-Shop Categories & Products
        # -------------------------------------------------------------
        cat_racquets = db.query(ProductCategory).filter(ProductCategory.name == "Racquets & Equipment").first()
        if not cat_racquets:
            cat_racquets = ProductCategory(
                name="Racquets & Equipment",
                module_type="shop",
                description="Professional racquets, strings, and grips for court sports",
            )
            db.add(cat_racquets)
            db.flush()

        cat_balls = db.query(ProductCategory).filter(ProductCategory.name == "Balls & Shuttles").first()
        if not cat_balls:
            cat_balls = ProductCategory(
                name="Balls & Shuttles",
                module_type="shop",
                description="Tournament-grade shuttles, tennis balls, and squash balls",
            )
            db.add(cat_balls)
            db.flush()

        cat_apparel = db.query(ProductCategory).filter(ProductCategory.name == "Accessories & Apparel").first()
        if not cat_apparel:
            cat_apparel = ProductCategory(
                name="Accessories & Apparel",
                module_type="shop",
                description="Club merchandise, grips, wristbands, and performance wear",
            )
            db.add(cat_apparel)
            db.flush()

        shop_products = [
            {
                "category_id": cat_racquets.id,
                "name": "Yonex Astrox 99 Pro Badminton Racquet",
                "sku": "YNX-AX99P",
                "module_type": "shop",
                "unit_price": Decimal("9500.00"),
                "tax_rate": Decimal("18.00"),
                "current_stock": 15,
                "reorder_threshold": 3,
                "is_active": True,
            },
            {
                "category_id": cat_racquets.id,
                "name": "Wilson Pro Staff 97 Tennis Racquet",
                "sku": "WLS-PS97",
                "module_type": "shop",
                "unit_price": Decimal("12500.00"),
                "tax_rate": Decimal("18.00"),
                "current_stock": 10,
                "reorder_threshold": 2,
                "is_active": True,
            },
            {
                "category_id": cat_balls.id,
                "name": "Yonex Aerosensa 30 Feather Shuttles (Tube of 12)",
                "sku": "YNX-AS30",
                "module_type": "shop",
                "unit_price": Decimal("1650.00"),
                "tax_rate": Decimal("12.00"),
                "current_stock": 40,
                "reorder_threshold": 10,
                "is_active": True,
            },
            {
                "category_id": cat_balls.id,
                "name": "Wilson US Open Tennis Balls (Can of 3)",
                "sku": "WLS-USO3",
                "module_type": "shop",
                "unit_price": Decimal("450.00"),
                "tax_rate": Decimal("12.00"),
                "current_stock": 60,
                "reorder_threshold": 15,
                "is_active": True,
            },
            {
                "category_id": cat_apparel.id,
                "name": "Yonex Super Grap Overgrip (Pack of 3)",
                "sku": "YNX-AC102",
                "module_type": "shop",
                "unit_price": Decimal("350.00"),
                "tax_rate": Decimal("18.00"),
                "current_stock": 80,
                "reorder_threshold": 20,
                "is_active": True,
            },
            {
                "category_id": cat_apparel.id,
                "name": "Champions Club Performance Quick-Dry Towel",
                "sku": "CC-TWL01",
                "module_type": "shop",
                "unit_price": Decimal("499.00"),
                "tax_rate": Decimal("12.00"),
                "current_stock": 30,
                "reorder_threshold": 5,
                "is_active": True,
            },
        ]

        for p_item in shop_products:
            prod = db.query(Product).filter(Product.sku == p_item["sku"]).first()
            if not prod:
                prod = Product(**p_item)
                db.add(prod)
                print(f"[+] Created Product: {prod.name} ({prod.sku})")
            else:
                prod.current_stock = p_item["current_stock"]
                prod.unit_price = p_item["unit_price"]
                prod.is_active = True
        db.flush()

        # -------------------------------------------------------------
        # 7. Cafeteria Menu Offerings
        # -------------------------------------------------------------
        cat_cafe_bev = db.query(ProductCategory).filter(ProductCategory.name == "Cafeteria Beverages").first()
        if not cat_cafe_bev:
            cat_cafe_bev = ProductCategory(
                name="Cafeteria Beverages",
                module_type="cafeteria",
                description="Post-workout smoothies, hydration drinks, and hot coffee",
            )
            db.add(cat_cafe_bev)
            db.flush()

        cat_cafe_food = db.query(ProductCategory).filter(ProductCategory.name == "Cafeteria Snacks & Meals").first()
        if not cat_cafe_food:
            cat_cafe_food = ProductCategory(
                name="Cafeteria Snacks & Meals",
                module_type="cafeteria",
                description="Healthy protein snacks, wraps, and gourmet bowls",
            )
            db.add(cat_cafe_food)
            db.flush()

        cafe_products = [
            {
                "category_id": cat_cafe_bev.id,
                "name": "Whey Protein Shake (Double Chocolate)",
                "sku": "CAF-SHAKE01",
                "module_type": "cafeteria",
                "unit_price": Decimal("180.00"),
                "tax_rate": Decimal("5.00"),
                "current_stock": 100,
                "reorder_threshold": 20,
                "is_active": True,
            },
            {
                "category_id": cat_cafe_bev.id,
                "name": "Electrolyte Energy Drink (Citrus)",
                "sku": "CAF-DRINK01",
                "module_type": "cafeteria",
                "unit_price": Decimal("90.00"),
                "tax_rate": Decimal("5.00"),
                "current_stock": 120,
                "reorder_threshold": 25,
                "is_active": True,
            },
            {
                "category_id": cat_cafe_food.id,
                "name": "Grilled Chicken & Egg Protein Sandwich",
                "sku": "CAF-SNDW01",
                "module_type": "cafeteria",
                "unit_price": Decimal("220.00"),
                "tax_rate": Decimal("5.00"),
                "current_stock": 50,
                "reorder_threshold": 10,
                "is_active": True,
            },
            {
                "category_id": cat_cafe_food.id,
                "name": "Paneer Tikka Multigrain Wrap",
                "sku": "CAF-WRAP01",
                "module_type": "cafeteria",
                "unit_price": Decimal("190.00"),
                "tax_rate": Decimal("5.00"),
                "current_stock": 40,
                "reorder_threshold": 10,
                "is_active": True,
            },
        ]

        for cp in cafe_products:
            prod = db.query(Product).filter(Product.sku == cp["sku"]).first()
            if not prod:
                prod = Product(**cp)
                db.add(prod)
                print(f"[+] Created Cafeteria Item: {prod.name}")
            else:
                prod.unit_price = cp["unit_price"]
                prod.current_stock = cp["current_stock"]
                prod.is_active = True
        db.flush()

        # -------------------------------------------------------------
        # 8. HR Departments, Designations & Staff Employees
        # -------------------------------------------------------------
        dept_front = db.query(Department).filter(Department.name == "Front Desk Operations").first()
        if not dept_front:
            dept_front = Department(name="Front Desk Operations", description="Reception, visitor intake, and bookings")
            db.add(dept_front)
            db.flush()

        dept_sports = db.query(Department).filter(Department.name == "Sports & Facilities").first()
        if not dept_sports:
            dept_sports = Department(name="Sports & Facilities", description="Court maintenance, tournaments, coaching")
            db.add(dept_sports)
            db.flush()

        dept_retail = db.query(Department).filter(Department.name == "Retail & Dining").first()
        if not dept_retail:
            dept_retail = Department(name="Retail & Dining", description="Pro-Shop retail POS and kitchen cafeteria operations")
            db.add(dept_retail)
            db.flush()

        desig_rec = db.query(Designation).filter(Designation.title == "Front Desk Executive").first()
        if not desig_rec:
            desig_rec = Designation(title="Front Desk Executive", department_id=dept_front.id)
            db.add(desig_rec)
            db.flush()

        desig_shop = db.query(Designation).filter(Designation.title == "Pro-Shop Specialist").first()
        if not desig_shop:
            desig_shop = Designation(title="Pro-Shop Specialist", department_id=dept_retail.id)
            db.add(desig_shop)
            db.flush()

        # Link Receptionist User to Employee
        rec_user = users_map["receptionist@championsclub.com"]
        emp_rec = db.query(Employee).filter(Employee.user_id == rec_user.id).first()
        if not emp_rec:
            emp_rec = Employee(
                user_id=rec_user.id,
                employee_code="EMP-001",
                first_name="Priya",
                last_name="Sharma",
                work_email="receptionist@championsclub.com",
                phone="+91 98765 00002",
                department_id=dept_front.id,
                designation_id=desig_rec.id,
                joining_date=date.today() - timedelta(days=180),
                employment_status="active",
            )
            db.add(emp_rec)
            db.flush()
            print("[+] Linked Employee: Priya Sharma (Front Desk Executive)")

        # Link Shop Staff User to Employee
        shop_user = users_map["shop@championsclub.com"]
        emp_shop = db.query(Employee).filter(Employee.user_id == shop_user.id).first()
        if not emp_shop:
            emp_shop = Employee(
                user_id=shop_user.id,
                employee_code="EMP-002",
                first_name="Ramesh",
                last_name="Kumar",
                work_email="shop@championsclub.com",
                phone="+91 98765 00006",
                department_id=dept_retail.id,
                designation_id=desig_shop.id,
                joining_date=date.today() - timedelta(days=120),
                employment_status="active",
            )
            db.add(emp_shop)
            db.flush()
            print("[+] Linked Employee: Ramesh Kumar (Pro-Shop Specialist)")

        # -------------------------------------------------------------
        # 9. Scheduled Friday Social Play Session
        # -------------------------------------------------------------
        badminton_court = db.query(Court).filter(Court.sport_type == "badminton").first()
        if badminton_court:
            # Find next upcoming Friday
            today = date.today()
            days_ahead = 4 - today.weekday()  # Friday is weekday 4
            if days_ahead <= 0:
                days_ahead += 7
            next_friday = today + timedelta(days=days_ahead)

            social_session = db.query(SocialPlaySession).filter(
                SocialPlaySession.court_id == badminton_court.id,
                SocialPlaySession.title == "Friday Night Badminton Doubles Mixer",
            ).first()

            if not social_session:
                start_dt = datetime(next_friday.year, next_friday.month, next_friday.day, 18, 0, 0, tzinfo=timezone.utc)
                end_dt = datetime(next_friday.year, next_friday.month, next_friday.day, 20, 0, 0, tzinfo=timezone.utc)
                social_session = SocialPlaySession(
                    court_id=badminton_court.id,
                    title="Friday Night Badminton Doubles Mixer",
                    start_time=start_dt,
                    end_time=end_dt,
                    max_capacity=12,
                    fee_per_participant=Decimal("250.00"),
                    status="scheduled",
                )
                db.add(social_session)
                db.flush()
                print(f"[+] Scheduled Social Play: Friday Night Badminton Doubles Mixer on {next_friday}")

        db.commit()
        print("=" * 60)
        print("Champions Club Comprehensive Seeding Completed Successfully!")
        print("=" * 60)
    except Exception as e:
        db.rollback()
        print(f"[!] Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
