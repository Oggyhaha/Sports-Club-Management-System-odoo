import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  Award,
  ShieldCheck,
  ShoppingBag,
  Coffee,
  ArrowRight,
  ChevronRight,
  Star,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Activity,
  Layers,
  Flame,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultPortalPath } from '../../config/navigation';
import Button from '../../components/common/Button';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, roles, logout } = useAuth();

  const handlePortalRedirect = () => {
    if (isAuthenticated && roles?.length > 0) {
      navigate(getDefaultPortalPath(roles));
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-500 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP ANNOUNCEMENT BAR & NAVIGATION                           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-3xs uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Facility
            </span>
            <span>Open Daily 06:00 – 22:00 IST • Prestige Tech Park, Bengaluru</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <Phone className="w-3.5 h-3.5" /> +91 98765 00000
            </span>
            <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <Mail className="w-3.5 h-3.5" /> concierge@championsclub.com
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-none">
                CHAMPIONS CLUB
              </span>
              <span className="text-3xs uppercase tracking-widest font-semibold text-sky-600 block mt-0.5">
                Premier Athletic & Racquet Club
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#facilities" className="hover:text-sky-600 transition-colors">
              Facilities & Arenas
            </a>
            <a href="#memberships" className="hover:text-sky-600 transition-colors">
              Membership Tiers
            </a>
            <a href="#social-play" className="hover:text-sky-600 transition-colors">
              Friday Social Mixer
            </a>
            <a href="#erp-features" className="hover:text-sky-600 transition-colors">
              Club Enterprise System
            </a>
            <a href="#contact" className="hover:text-sky-600 transition-colors">
              Contact & Hours
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePortalRedirect}
                  className="font-semibold shadow-sm"
                  rightIcon={ArrowRight}
                >
                  My Workspace ({roles?.[0]?.replace('_', ' ') || 'Portal'})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="text-slate-600"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="font-medium"
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="font-semibold shadow-sm"
                  rightIcon={ChevronRight}
                >
                  Join Club
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-20 pb-28">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-sky-400 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>International Standard Sports & Racquet Facility</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Where Champions Train, Compete & Thrive.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              A private premier sports destination featuring Olympic-grade badminton courts, all-weather tennis arenas, championship squash glass courts, pro gear shop, gourmet athlete dining, and integrated digital management.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/bookings/availability');
                  } else {
                    navigate('/login');
                  }
                }}
                className="px-6 py-3 font-bold text-sm bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30"
                rightIcon={ArrowRight}
              >
                Reserve a Court Slot
              </Button>

              <a
                href="#memberships"
                className="px-6 py-3 font-semibold text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all inline-flex items-center gap-2"
              >
                Explore Membership Tiers
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-800/40 rounded-2xl border border-slate-700/60 backdrop-blur-xs">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">8+ Courts</p>
                <p className="text-2xs sm:text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
                  Badminton, Tennis, Squash
                </p>
              </div>
              <div className="text-center border-l border-slate-700/60">
                <p className="text-2xl sm:text-3xl font-extrabold text-sky-400">16h Daily</p>
                <p className="text-2xs sm:text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
                  06:00 – 22:00 IST Schedule
                </p>
              </div>
              <div className="text-center border-l border-slate-700/60">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">100+ Members</p>
                <p className="text-2xs sm:text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
                  Elite Racquet Community
                </p>
              </div>
              <div className="text-center border-l border-slate-700/60">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100% Real-Time</p>
                <p className="text-2xs sm:text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
                  Cloud ERP & POS Integration
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. FACILITIES & SPORTING ARENAS                                */}
      {/* ------------------------------------------------------------- */}
      <section id="facilities" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-sky-600 block mb-2">
            World-Class Infrastructure
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for Peak Performance
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Every arena is equipped with shock-absorbing surfaces, professional LED illumination, and international tournament specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Facility 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold mb-5 border border-sky-100">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Badminton Arena</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              BWF-certified multi-layer synthetic court mats, high-ceiling clearance, glare-free vertical lighting, and Yonex tournament netting.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> 4 Dedicated Championship Courts
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> ₹400/h Standard (50% Off for Gold)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Shuttles & Rental Racquets available
              </li>
            </ul>
          </div>

          {/* Facility 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-5 border border-indigo-100">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Tennis Arenas</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              All-weather cushioned hard courts with true bounce engineering, floodlit for night matches, with automated ball-machine drill rentals.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Singles & Doubles Layouts
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> ₹600/h Standard Hourly Booking
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Certified Coach Instruction available
              </li>
            </ul>
          </div>

          {/* Facility 3 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-5 border border-amber-100">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Squash Glass Courts</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              WSF-standard glass-backed courts with Junckers sprung beechwood flooring, climate controlled for optimum ball temperature and speed.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> High-impact impact-resistant glass
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Non-marking footwear mandate
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Dunlop double-yellow ball store
              </li>
            </ul>
          </div>

          {/* Facility 4 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-5 border border-emerald-100">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Pro-Shop & Gear Lab</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Authorized retailer for Yonex, Head, Wilson, and Victor. Electronic racket stringing tensioning machine and ergonomic grip fitting.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Certified Same-Day Restringing
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Direct Member Discounts on gear
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Demo racket trial program
              </li>
            </ul>
          </div>

          {/* Facility 5 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-5 border border-rose-100">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Champions Bistro & Cafe</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Nutritionist-curated pre- and post-workout fuel. Fresh fruit smoothies, high-protein energy bowls, artisanal espresso, and recovery snacks.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Real-time Kitchen Display queue
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Court-side drink delivery
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Contactless POS checkout
              </li>
            </ul>
          </div>

          {/* Facility 6 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-5 border border-purple-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Locker Suites & Sauna</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Spacious private changing suites, secure electronic lockers, rainfall showers, steam recovery bath, and complimentary towel service.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Keycard Access Security
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Daily Sanitized Lockers
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Premium Grooming Amenities
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. MEMBERSHIP TIERS PRICING SECTION                            */}
      {/* ------------------------------------------------------------- */}
      <section id="memberships" className="py-24 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-widest text-sky-400 block mb-2">
              Privileges & Access
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Simple, Transparent Membership Plans
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Select your membership tier to enjoy exclusive court discounts, retail savings, and priority reservation windows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan 1: Junior */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Junior Academy</span>
                  <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">Under 18</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹25</span>
                  <span className="text-xs text-slate-400">/ 30 days</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Specialized program for youth athletes under 18 years dedicated to fundamental skills and coaching.
                </p>

                <div className="mt-6 pt-6 border-t border-slate-700/80 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>30% Discount</strong> on court reservations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Weekend coaching clinic access</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Locker and practice net access</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="md"
                onClick={() => navigate(isAuthenticated ? '/members/plans' : '/register')}
                className="w-full mt-8 border-slate-600 text-white hover:bg-slate-700"
              >
                Join Junior Academy
              </Button>
            </div>

            {/* Plan 2: Gold Elite (Recommended) */}
            <div className="bg-gradient-to-b from-sky-900/40 to-slate-800 rounded-2xl border-2 border-sky-500 p-8 flex flex-col justify-between relative shadow-xl shadow-sky-950/50">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-sky-500 text-white text-3xs font-extrabold uppercase tracking-widest shadow-md">
                Most Popular Tier
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Gold Elite</span>
                  <span className="text-3xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold">Priority Booking</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹100</span>
                  <span className="text-xs text-slate-400">/ 30 days</span>
                </div>
                <p className="mt-3 text-xs text-slate-300">
                  Our premier tier with maximum court savings, Pro-Shop allowances, and priority 7-day advance booking.
                </p>

                <div className="mt-6 pt-6 border-t border-sky-800/80 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span><strong>50% Huge Discount</strong> on all sports courts</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Free Entry to Friday Night Social Mixers</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Priority 7-Day Advance Slot Reservations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Pro-Shop & Cafeteria Member Savings</span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(isAuthenticated ? '/members/plans' : '/register')}
                className="w-full mt-8 bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-md shadow-sky-600/30"
              >
                Get Gold Membership
              </Button>
            </div>

            {/* Plan 3: Silver Standard */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Silver Regular</span>
                  <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">Standard</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹50</span>
                  <span className="text-xs text-slate-400">/ 30 days</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Designed for active recreational players who want consistent court availability and steady member discounts.
                </p>

                <div className="mt-6 pt-6 border-t border-slate-700/80 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>20% Discount</strong> on court reservations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>3-Day Advance Slot Reservations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Locker and shower access included</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="md"
                onClick={() => navigate(isAuthenticated ? '/members/plans' : '/register')}
                className="w-full mt-8 border-slate-600 text-white hover:bg-slate-700"
              >
                Join Silver Regular
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. FRIDAY SOCIAL PLAY SPOTLIGHT                                */}
      {/* ------------------------------------------------------------- */}
      <section id="social-play" className="py-20 bg-slate-100 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-sky-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold uppercase tracking-wider inline-block mb-3">
                Weekly Club Tradition
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Friday Night Social Play & Doubles Mixer
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Every Friday from 18:00 to 21:00 IST. Open to members and guests. Rotational doubles matches, friendly competition, complimentary hydration, and social networking with fellow racquet sport enthusiasts.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" /> Every Friday • 18:00 – 21:00 IST
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" /> 16 Max Player Capacity
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(isAuthenticated ? '/social-play' : '/login')}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6"
                rightIcon={ArrowRight}
              >
                Join This Friday's Session
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. ENTERPRISE CLUB ARCHITECTURE SHOWCASE                       */}
      {/* ------------------------------------------------------------- */}
      <section id="erp-features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-sky-600 block mb-2">
            Enterprise Operating System
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Integrated Role-Based Club ERP
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Champions Club is powered by a modern modular cloud ERP system with dedicated workspaces tailored for every club role.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">Executive</span>
            <h4 className="font-bold text-slate-900 text-sm mt-3">Owner Analytics</h4>
            <p className="text-xs text-slate-500 mt-1">
              Live executive KPIs, cash flow reconciliations, GST tax filings, and court utilization analytics.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">Front Desk</span>
            <h4 className="font-bold text-slate-900 text-sm mt-3">Reception Matrix</h4>
            <p className="text-xs text-slate-500 mt-1">
              Real-time 30-min slot matrix, walk-in customer intake, member validation, and emergency cancellations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">Commerce</span>
            <h4 className="font-bold text-slate-900 text-sm mt-3">Pro-Shop POS & KDS</h4>
            <p className="text-xs text-slate-500 mt-1">
              Barcode SKU retail counter, automated stock decrements, and live kitchen display tickets.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Administration</span>
            <h4 className="font-bold text-slate-900 text-sm mt-3">HR & Corporate Finance</h4>
            <p className="text-xs text-slate-500 mt-1">
              Biometric punch-clock attendance, monthly payroll runs, B2B institutional contracts, and invoicing.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. CONTACT, HOURS & FOOTER                                     */}
      {/* ------------------------------------------------------------- */}
      <footer id="contact" className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
            {/* Column 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="font-bold text-base tracking-tight">CHAMPIONS CLUB</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Premier private sports and racquet facility providing professional court rentals, academy coaching, retail gear, and gourmet dining.
              </p>
            </div>

            {/* Column 2: Navigation */}
            <div>
              <p className="text-white font-semibold mb-3">Quick Navigation</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#facilities" className="hover:text-white transition-colors">Sports Facilities</a>
                </li>
                <li>
                  <a href="#memberships" className="hover:text-white transition-colors">Membership Plans</a>
                </li>
                <li>
                  <a href="#social-play" className="hover:text-white transition-colors">Friday Social Mixer</a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">Staff & Member Login</Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Hours */}
            <div>
              <p className="text-white font-semibold mb-3">Operating Hours</p>
              <ul className="space-y-2 text-xs">
                <li className="flex justify-between">
                  <span>Monday – Friday:</span>
                  <span className="text-white font-mono">06:00 – 22:00 IST</span>
                </li>
                <li className="flex justify-between">
                  <span>Saturday – Sunday:</span>
                  <span className="text-white font-mono">06:00 – 22:00 IST</span>
                </li>
                <li className="flex justify-between">
                  <span>Holidays:</span>
                  <span className="text-white font-mono">07:00 – 21:00 IST</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div>
              <p className="text-white font-semibold mb-3">Club Concierge</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>Prestige Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>+91 98765 00000</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>concierge@championsclub.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-3xs text-slate-500">
            <p>© {new Date().getFullYear()} Champions Club Sports Management System. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-slate-300">Staff Portal</Link>
              <span>•</span>
              <Link to="/login" className="hover:text-slate-300">Member Portal</Link>
              <span>•</span>
              <Link to="/login" className="hover:text-slate-300">Corporate Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
