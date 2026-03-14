function App() {
  return (
    <>
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 lg:px-20 py-4 sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-primary">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_with_heart
                </span>
                <h2 className="text-slate-900 dark:text-white text-xl font-black leading-tight tracking-tight">
                  SafeCity
                </h2>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                <a
                  className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors"
                  href="#"
                >
                  Map
                </a>
                <a
                  className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-colors"
                  href="#"
                >
                  Reports
                </a>
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
            <div className="flex flex-1 justify-end gap-4 items-center">
              <label className="hidden sm:flex flex-col min-w-40 h-10 max-w-64">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden">
                  <div className="text-slate-400 flex bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4">
                    <span className="material-symbols-outlined text-xl">
                      search
                    </span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 border-none bg-slate-100 dark:bg-slate-800 focus:ring-0 h-full placeholder:text-slate-500 text-sm font-normal px-3"
                    placeholder="Search neighborhood..."
                    value=""
                  />
                </div>
              </label>
              <button className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90">
                <span>Login</span>
              </button>
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20"
                data-alt="User profile avatar portrait"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCqTTpxUE7cLjIsnH-b2Dn1knEyBVL18GtoJGtZGnuEhbY5qK4P2qyQdIwbGmo0XbzYezAAxyEwLCCHxiN-Kah0pR3mHM-2wMjfEa2g38u0ers9Z6zHamGDsgYGS4sf0choCJkYi22YYHAGF0Mrqqudjw_S1XvBu5X053q-f0nai9S-R1LdHDnfCPfuW3nYRzubvVZ6jrdWiWP8CAbwpfPtBDANL9_iGsnC0z0JNhqvnyPsHh7nTmU4HAGLvk4aSV1ngCI8wY3cazob")',
                }}
              ></div>
            </div>
          </header>
          <main className="flex-1">
            <div className="relative w-full h-[550px] overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                data-alt="Dark futuristic city map with glowing markers"
                data-location="San Francisco"
                style={{
                  backgroundImage: `linear-gradient(
    to right, 
    rgba(16, 25, 34, 0.95) 30%, 
    rgba(16, 25, 34, 0.2) 100%
  ), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDwxtqBz3AKYg7wIMxb6WVdIxtyS9ruEejOStw_zqmfdklW7BLU7zJJzQ153CXmoD1VgrZhYQhsASUDRtHqOlJR7QlZBrlK43mfaZThMFvISlwrhttYuRCnbzajvtJiS5EqQ-_ZDNDkWuECQEqfY02E-J0B0uGlnqVrwdnqO2Dr0mhoyM4U4c5xt2_FH_DOU7UXHNeQKhCienhemuWIzlXl_bRp9hoHZHdA5SUtAx40RFiTGRTkmnzKKKeI3ekdlAH8IR-LqzEYQ7SO")`,
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
                  <button className="flex items-center gap-2 cursor-pointer rounded-xl h-14 px-8 bg-alert-red text-white text-base font-bold transition-all hover:scale-105 shadow-lg shadow-alert-red/20">
                    <span className="material-symbols-outlined">report</span>
                    <span>Report Incident</span>
                  </button>
                  <button className="flex items-center gap-2 cursor-pointer rounded-xl h-14 px-8 bg-white/10 backdrop-blur-md border border-white/20 text-white text-base font-bold transition-all hover:bg-white/20">
                    <span className="material-symbols-outlined">map</span>
                    <span>View Live Map</span>
                  </button>
                  <button className="flex items-center gap-2 cursor-pointer rounded-xl h-14 px-8 bg-primary text-white text-base font-bold transition-all hover:bg-primary/90 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">sos</span>
                    <span>Personal SOS</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-20 -mt-16 relative z-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-2xl p-8 flex flex-col gap-3 shadow-2xl">
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
                <div className="glass-card rounded-2xl p-8 flex flex-col gap-3 shadow-2xl">
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
                <div className="glass-card rounded-2xl p-8 flex flex-col gap-3 shadow-2xl">
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
              </div>
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
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                    24h
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-md">
                    7 Days
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                    30 Days
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-2xl aspect-video relative overflow-hidden group">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      data-alt="Modern interactive map UI with safety heatmaps"
                      data-location="London Metropolitan Area"
                      style={{
                        backgroundImage:
                          'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC80rcVKKXRUoX29mrHowyOwlmq1kWJWqUrlnFBQ2uD1x8LP_ph0YPN5CsDzlHAYEUR1sM8f-cys2Z_6h8KGNGXvyoVHtNeW0A0wIlObqH7sMTWnRycg2c6y7dUr_ybGpl1UpHCMK021a-O2r3AfxF6EW0SaqRSEidBY29EXpcGnFx-tKu0uyXvkKwBaeulhGpr_PossyUjKqaRel8-ZM_oZKHhJ6i6bHtYwyrc0-aXI5wdIrv3442ZxAiKBYyLD5VLsXgLd3cAzrFw")',
                      }}
                    ></div>
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <button className="size-10 rounded-full bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center text-slate-700 dark:text-slate-200">
                        <span className="material-symbols-outlined">add</span>
                      </button>
                      <button className="size-10 rounded-full bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center text-slate-700 dark:text-slate-200">
                        <span className="material-symbols-outlined">
                          remove
                        </span>
                      </button>
                      <button className="size-10 rounded-full bg-primary shadow-xl flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">
                          my_location
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Live Activity Feed
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex gap-4">
                    <div className="size-10 rounded-lg bg-alert-red/20 text-alert-red flex shrink-0 items-center justify-center">
                      <span className="material-symbols-outlined text-xl">
                        warning
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Suspicious Activity
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Reported 2 mins ago in Oak Park
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex gap-4">
                    <div className="size-10 rounded-lg bg-warning-orange/20 text-warning-orange flex shrink-0 items-center justify-center">
                      <span className="material-symbols-outlined text-xl">
                        bolt
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Street Light Outage
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Reported 15 mins ago in Downtown
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex gap-4">
                    <div className="size-10 rounded-lg bg-safe-green/20 text-safe-green flex shrink-0 items-center justify-center">
                      <span className="material-symbols-outlined text-xl">
                        verified
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Patrol Completed
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sector 4 verified safe by Community Watch
                      </p>
                    </div>
                  </div>
                  <button className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    View All Reports
                  </button>
                </div>
              </div>
            </div>
          </main>
          <footer className="bg-slate-50 dark:bg-[#0c141b] border-t border-slate-200 dark:border-slate-800 py-12">
            <div className="max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-primary">
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    shield_with_heart
                  </span>
                  <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">
                    SafeCity
                  </h2>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Empowering communities with technology to create safer, more
                  connected neighborhoods through real-time awareness and
                  reporting.
                </p>
              </div>
              <div>
                <h4 className="text-slate-900 dark:text-white font-bold mb-4">
                  Platform
                </h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      Safety Map
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-primary transition-colors"
                      href="#"
                    >
                      Incident Reporting
                    </a>
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
                <h4 className="text-slate-900 dark:text-white font-bold mb-4">
                  Newsletter
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Get safety alerts for your neighborhood directly to your
                  inbox.
                </p>
                <div className="flex gap-2">
                  <input
                    className="bg-white dark:bg-slate-800 border-none rounded-lg text-sm flex-1 focus:ring-primary"
                    placeholder="Email address"
                    type="email"
                  />
                  <button className="bg-primary text-white p-2 rounded-lg">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-20 mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-xs">
                © 2024 SafeCity Technologies Inc. All rights reserved.
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
