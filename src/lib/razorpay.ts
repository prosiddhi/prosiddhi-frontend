// Razorpay Checkout SDK loader + minimal types.
//
// The SDK (checkout.js) is loaded lazily the first time a buyer opens checkout,
// so it never costs the rest of the app. loadRazorpay() injects the script once
// and resolves the global constructor; concurrent/repeat calls share one load.

const SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js'

export interface RazorpayHandlerResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface RazorpayOptions {
  key: string
  order_id: string
  amount: number // in paise
  currency: string
  name: string
  description?: string
  handler: (response: RazorpayHandlerResponse) => void
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

export interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (...args: unknown[]) => void) => void
}

export type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

let sdkPromise: Promise<RazorpayConstructor> | null = null

export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay is not available on the server'))
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay)
      else reject(new Error('Razorpay SDK loaded but constructor is missing'))
    }
    script.onerror = () => {
      sdkPromise = null // allow a retry on next attempt
      reject(new Error('Failed to load the Razorpay checkout SDK'))
    }
    document.body.appendChild(script)
  })
  return sdkPromise
}
