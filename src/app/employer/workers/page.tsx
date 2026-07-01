'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// PJP-143 routing fix (2026-06-15): the employer dashboard moved from
// /employer/workers to /employer. This stub redirects any old links or bookmarks
// to the new home so nothing 404s.
export default function EmployerWorkersRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/employer')
  }, [router])
  return null
}
