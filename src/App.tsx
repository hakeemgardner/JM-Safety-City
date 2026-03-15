import { useEffect } from "react";
import { Link } from "react-router";
import SafetyMap from "./components/SafetyMap";
import kingstonImg from "./assets/kingston.png";

function App() {
  useEffect(() => {
    document.title = "G.R.I.D — Geo-Referenced Incident Database | Kingston, Jamaica";
  }, []);

  return (
    <>
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 lg:px-20 py-4 sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 dark:text-white font-bold text-xl">
                G.R.I.D
              </span>
            </div>
            <div className="flex items-center justify-end gap-8">
              <nav className="hidden md:flex items-center gap-8">
                <Link
                  className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors"
                  to="/map"
                >
                  Map
                </Link>
                <Link
                  className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors"
                  to="/IncidentReportPage"
                >
                  Reports
                </Link>
                <a
                  className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors"
                  href="#"
                >
                  SOS
                </a>
                <a
                  className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors"
                  href="#"
                >
                  Business
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <div className="relative w-full h-[550px] overflow-hidden mb-16">
              <div
                className="absolute inset-0 bg-cover bg-center"
                data-alt="Map of Kingston, Jamaica"
                data-location="Kingston"
                style={{
                  backgroundImage: `linear-gradient(
    to right, 
    rgba(16, 25, 34, 0.95) 30%, 
    rgba(16, 25, 34, 0.2) 100%
  ), url(${kingstonImg})`,
                }}
              ></div>
              <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-20 h-full flex flex-col justify-center gap-8">
                <div className="max-w-2xl flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-alert-red/10 border border-alert-red/20 text-alert-red text-xs font-bold uppercase tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-red opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-alert-red"></span>
                    </span>
                    Live Safety Monitoring Active
                  </div>
                  <h1 className="text-white text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                    Real-Time Community{" "}
                    <span className="text-primary">Safety</span> &amp; Awareness
                  </h1>
                  <p className="text-slate-300 text-lg font-medium leading-relaxed max-w-xl">
                    Stay informed, stay safe. Monitor active incidents and
                    report emergencies instantly to protect your neighborhood
                    with AI-powered insights.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link to="/IncidentReportPage" className="flex items-center gap-2 cursor-pointer rounded-xl h-14 px-8 bg-alert-red text-white text-base font-bold transition-all hover:scale-105 shadow-lg shadow-alert-red/20">
                    <span className="material-symbols-outlined">report</span>
                    <span>Report Incident</span>
                  </Link>
                  <Link to="/map" className="flex items-center gap-2 cursor-pointer rounded-xl h-14 px-8 bg-white/10 backdrop-blur-md border border-white/20 text-white text-base font-bold transition-all hover:bg-white/20">
                    <span className="material-symbols-outlined">map</span>
                    <span>View Live Map</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-20 -mt-16 relative z-20">
              {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-2xl p-8 flex flex-col gap-3 shadow-2xl bg-white/5 dark:bg-slate-900/30 backdrop-blur-md border border-white/10 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                      Active Alerts
                    </p>
                    <div className="p-2 rounded-lg bg-alert-red/10 text-alert-red">
                      <span className="material-symbols-outlined">
                        campaign
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-white text-4xl font-black">12</p>
                    <p className="text-alert-red text-sm font-bold flex items-center">
                      <span className="material-symbols-outlined text-sm">
                        trending_up
                      </span>{" "}
                      +5%
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs">
                    Significant activity in North District
                  </p>
                </div>
                <div className="glass-card rounded-2xl p-8 flex flex-col gap-3 shadow-2xl bg-white/5 dark:bg-slate-900/30 backdrop-blur-md border border-white/10 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                      Safe Zones
                    </p>
                    <div className="p-2 rounded-lg bg-safe-green/10 text-safe-green">
                      <span className="material-symbols-outlined">
                        verified_user
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-white text-4xl font-black">84%</p>
                    <p className="text-safe-green text-sm font-bold flex items-center">
                      <span className="material-symbols-outlined text-sm">
                        verified
                      </span>{" "}
                      Optimal
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs">
                    7 out of 9 sectors are clear
                  </p>
                </div>
                <div className="glass-card rounded-2xl p-8 flex flex-col gap-3 shadow-2xl bg-white/5 dark:bg-slate-900/30 backdrop-blur-md border border-white/10 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                      Recent Reports
                    </p>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <span className="material-symbols-outlined">history</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-white text-4xl font-black">156</p>
                    <p className="text-primary text-sm font-bold flex items-center">
                      <span className="material-symbols-outlined text-sm">
                        trending_up
                      </span>{" "}
                      +12%
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs">
                    Community engagement increasing
                  </p>
                </div>
              </div> */}
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-20 py-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">
                    Safety Overview
                  </h2>
                  <p className="text-slate-500 mt-1">
                    Real-time heatmap of community reported incidents
                  </p>
                </div>
                {/* <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                    24h
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-md">
                    7 Days
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                    30 Days
                  </button>
                </div> */}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                  <Link
                    to="/map"
                    className="block w-full bg-slate-200 dark:bg-slate-800 rounded-2xl aspect-video relative overflow-hidden cursor-pointer group"
                  >
                    <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <SafetyMap />
                  </Link>
                </div>
                <div className="lg:col-span-1">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                      Legend
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-700/70">
                        <span className="material-symbols-outlined text-slate-500 text-sm">
                          database
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Incidents
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full bg-[#ef4444]" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Theft / Robbery
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full bg-[#dc2626]" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Assault / Violence
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full bg-[#f97316]" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Suspicious Activity
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full bg-[#eab308]" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Vandalism / Property
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full bg-[#3b82f6]" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Traffic / Road
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Hazards (Safe Route)
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-full bg-alert-red" />
                            High
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-full bg-warning-orange" />
                            Medium
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2.5 rounded-full bg-slate-400" />
                            Low
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Routes
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="block w-8 h-1 rounded-full bg-blue-500" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Fastest Route
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="block w-8 h-1 rounded-full bg-safe-green" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Safest Route
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <footer className="bg-slate-50 dark:bg-[#0c141b] border-t border-slate-200 dark:border-slate-800 py-12">
            <div className="max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white font-bold text-lg">G.R.I.D</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Empowering Kingston communities with geo-referenced
                  intelligence to create safer, more connected neighborhoods
                  through real-time incident tracking and reporting.
                </p>
              </div>
              <div>
                <h4 className="text-slate-900 dark:text-white font-bold mb-4">
                  Platform
                </h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>
                    <Link
                      className="hover:text-primary transition-colors"
                      to="/map"
                    >
                      Safety Map
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="hover:text-primary transition-colors"
                      to="/IncidentReportPage"
                    >
                      Incident Reporting
                    </Link>
                  </li>
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      AI Analysis
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      SOS Services
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-slate-900 dark:text-white font-bold mb-4">
                  Resources
                </h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      Safety Guides
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      Community Blog
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      API Docs
                    </a>
                  </li>
                </ul>
              </div>
              <div>
               
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-20 mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-xs">
                © 2025 G.R.I.D — Geo-Referenced Incident Database. All rights reserved.
              </p>
              <div className="flex gap-6">
                <span className="material-symbols-outlined text-slate-400 hover:text-primary cursor-pointer">
                  public
                </span>
                <span className="material-symbols-outlined text-slate-400 hover:text-primary cursor-pointer">
                  chat
                </span>
                <span className="material-symbols-outlined text-slate-400 hover:text-primary cursor-pointer">
                  share
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default App;
