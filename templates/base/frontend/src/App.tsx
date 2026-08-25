import { BrowserRouter, Route, Routes } from 'react-router-dom'
// DTAO:PAGE_IMPORTS

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen relative">
        <div className="fixed inset-0 -z-10 opacity-70 dark:opacity-30 pointer-events-none frosted-bg-canvas" />
        <Routes>
          {/* DTAO:PAGE_ROUTES */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center p-8 rounded-3xl frosted-card">
                  <h1 className="text-2xl font-extrabold text-sky-950 dark:text-white mb-2">dtao project</h1>
                  <p className="text-slate-600 dark:text-slate-300">
                    Run <code className="text-sky-600 dark:text-sky-400 font-mono">dtao add login</code> to add your first feature.
                  </p>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
