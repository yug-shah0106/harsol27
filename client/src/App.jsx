import SellerInterestForm from './SellerInterestForm.jsx'

function App() {
  return (
    <main className="min-h-svh bg-slate-50 px-4 py-12 text-slate-800 sm:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900">Sell on IndiaMartClone</h1>
        <p className="mt-2 text-slate-600">
          Tell us about your business and our team will help you get listed.
        </p>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SellerInterestForm />
        </div>
      </div>
    </main>
  )
}

export default App
