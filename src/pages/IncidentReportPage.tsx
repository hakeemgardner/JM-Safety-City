import React from "react";

const IncidentReportPage = () => {
  return (
    <div>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/20 px-6 lg:px-10 py-3 bg-background-light dark:bg-background-dark sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="size-8 text-primary">
              <svg
                fill="none"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-tight">
              SafeCity
            </h2>
          </div>
          <div className="flex flex-1 justify-end gap-8 items-center">
            <nav className="hidden md:flex items-center gap-8">
              <a
                className="text-sm font-medium hover:text-primary transition-colors"
                href="#"
              >
                Dashboard
              </a>
              <a
                className="text-sm font-medium hover:text-primary transition-colors"
                href="#"
              >
                Live Map
              </a>
              <a
                className="text-sm font-medium hover:text-primary transition-colors"
                href="#"
              >
                Alerts
              </a>
              <a
                className="text-sm font-medium hover:text-primary transition-colors"
                href="#"
              >
                Safety Tips
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
                Login
              </button>
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-primary/30"
                data-alt="User profile avatar placeholder"
                style={{
                  backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDRCNZNbPe8frD6D5SpgL-9kSPOtkRcY8DV3c9cldSwWPbRMhBHgM5CXAf0jhJYzgzy25Irfql8FInsclNLOWoQ8d4Zvp1nHmtO0z2edv3B-r7ODl_qPrskeplT-y93BEhEnNdA2cs47YEIqXhgxmbyHFoKN-VVw1-JRijSfsTdIB3OvCofi20ZUjdDqIuGjI3hvsLFnY8TSeovfltsjUZiTSFkVVXE5t5YBiVj1N1oORaw-deRaFDrCAPDUTh1PLX0ojUgILVS1xTK")`,
                }}
              ></div>
            </div>
          </div>
        </header>
        <main className="flex-1 py-12 px-4 md:px-0">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black tracking-tight mb-3">
                Report an Incident
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Your safety is our priority. Submit an anonymous report to alert
                the community. No personal data is stored.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <form className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Incident Category
                      </label>
                      <div className="relative">
                        <select className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent appearance-none">
                          <option disabled="" selected="" value="">
                            Select the type of incident
                          </option>
                          <option value="theft">Theft / Robbery</option>
                          <option value="vandalism">Vandalism</option>
                          <option value="assault">Physical Assault</option>
                          <option value="suspicious">
                            Suspicious Activity
                          </option>
                          <option value="traffic">Traffic Incident</option>
                          <option value="other">Other</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Detailed Description
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent min-h-[160px] resize-none"
                        placeholder="Provide details about what happened, time of day, and any identifying marks or vehicles..."
                      ></textarea>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Evidence / Photos
                      </label>
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                        <span className="material-symbols-outlined text-4xl text-primary mb-2">
                          cloud_upload
                        </span>
                        <p className="font-medium">
                          Click or drag to upload photos
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          PNG, JPG, or MP4 up to 10MB
                        </p>
                      </div>
                    </div>
                    <button
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-lg"
                      type="button"
                    >
                      <span className="material-symbols-outlined">
                        security
                      </span>
                      Submit Anonymously
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">
                        location_on
                      </span>
                      Incident Location
                    </h3>
                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Auto-filled
                    </span>
                  </div>
                  <div className="aspect-square w-full relative">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      data-alt="Satellite view of city map grid"
                      data-location="New York City"
                      style={{
                        backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJZUgphplw4nL0VttBjrT4m_GP44bjwdYpn3EelpTS5vy3Wc5KQi0NgZGl9u9i10ipJfbZM7WXqGmLRx-wwV86L5384APiRjK_EUr4-z4_DGwnYJAbQLcpi1426lfQyXiGCMrHCMmZW_YvRfYfg9HW7pK6gg0Ev7IhWJCVla80V3T4TaUfIQdd8NpGwu3ezLapQB6Ac8Ge7-MCCz3_RH9VGIYgFLOlCubt-zZhD1hPZHy8po0f-9kbdPsC1LPN2ztj5FOVQwAnYeBm')`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-3 py-1 rounded shadow-lg whitespace-nowrap text-xs font-bold border border-primary/30">
                          Current Location
                        </div>
                        <span className="material-symbols-outlined text-primary text-5xl drop-shadow-lg">
                          location_on
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm font-medium">
                      5th Ave &amp; E 23rd St, Manhattan, NY
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Coordinates: 40.7411° N, 73.9897° W
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Recent Submission
                      </p>
                      <p className="text-lg font-bold text-primary">SC-8821</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300">
                      receipt_long
                    </span>
                  </div>
                  <div className="space-y-6 relative">
                    <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-slate-800"></div>

                    <div className="relative flex items-center gap-4">
                      <div className="z-10 size-8 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-primary/20">
                        <span className="material-symbols-outlined text-sm">
                          check
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Received</p>
                        <p className="text-xs text-slate-500">
                          Today, 10:45 AM
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="z-10 size-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-400">
                          Reviewing
                        </p>
                        <p className="text-xs text-slate-500">Pending</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="z-10 size-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-sm">
                          verified_user
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-400">
                          Verified
                        </p>
                        <p className="text-xs text-slate-500">
                          Awaiting review
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-10 text-center">
          <p className="text-slate-500 text-sm">
            © 2024 SafeCity Community Initiative. All reports are encrypted and
            anonymous.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default IncidentReportPage;
