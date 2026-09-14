import { useState } from 'react'

const CATEGORIES = ['Manufacturing', 'Wholesale', 'Retail', 'Services', 'Trading', 'Other']
const EMPTY = { name: '', phoneNumber: '', email: '', businessCategory: '' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Name is required.'
  if (!values.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required.'
  if (!values.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Enter a valid email address, like name@company.com.'
  if (!values.businessCategory) errors.businessCategory = 'Select a business category.'
  return errors
}

export default function SellerInterestForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  function handleChange(e) {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    setErrors((errs) => ({ ...errs, [name]: undefined }))
    setStatus('idle')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const clientErrors = validate(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) {
      setStatus('idle')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/seller-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.status === 201) {
        setValues(EMPTY)
        setStatus('success')
        return
      }
      const body = await res.json().catch(() => ({}))
      if (res.status === 400 && body.fields) {
        setErrors(body.fields)
        setStatus('idle')
        return
      }
      setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const field = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: handleChange,
    required: true,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    className: `mt-1 block w-full rounded-md border bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 ${
      errors[name]
        ? 'border-red-500 focus:ring-red-500/30'
        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
    }`,
  })

  const error = (name) =>
    errors[name] && (
      <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
        {errors[name]}
      </p>
    )

  const submitting = status === 'submitting'

  return (
    <form onSubmit={handleSubmit} noValidate>
      {status === 'success' && (
        <p role="status" className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Thanks — we'll be in touch.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Something went wrong. Please try again in a moment.
        </p>
      )}

      <fieldset disabled={submitting} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
          <input type="text" autoComplete="name" {...field('name')} />
          {error('name')}
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700">Phone number</label>
          <input type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...field('phoneNumber')} />
          {error('phoneNumber')}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" autoComplete="email" placeholder="name@company.com" {...field('email')} />
          {error('email')}
        </div>

        <div>
          <label htmlFor="businessCategory" className="block text-sm font-medium text-slate-700">Business category</label>
          <select {...field('businessCategory')}>
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {error('businessCategory')}
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </fieldset>
    </form>
  )
}
