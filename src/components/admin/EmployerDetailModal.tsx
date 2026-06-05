'use client'

import { X, Phone, Mail, Building2, FileText, Eye, Check, Trash2, Scan, CheckSquare } from 'lucide-react'

interface EmployerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  employer: {
    id: string
    employerType: string
    companyName: string
    phoneNumber: string
    email: string
    paymentStatus: 'VERIFIED' | 'PENDING' | 'REJECTED'
    address?: string
    foundedDate?: string
    employeeSize?: string
    gstNumber?: string
    cinNumber?: string
    documents?: {
      name: string
      status: 'VERIFIED' | 'PENDING' | 'REJECTED'
    }[]
    paymentHistory?: {
      description: string
      date: string
      status: 'PAID' | 'PENDING'
    }[]
  }
}

export default function EmployerDetailModal({ isOpen, onClose, employer }: EmployerDetailModalProps) {
  if (!isOpen) return null

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-[#D4F4DD] text-[#4CAF50]'
      case 'PENDING':
        return 'bg-[#FFF4E5] text-[#FF9800]'
      case 'REJECTED':
        return 'bg-[#FFE4E1] text-[#E57373]'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getEmployerTypeColor = () => {
    return 'bg-[#47B2E4] text-white'
  }

  const formatPaymentStatus = (status: string) => {
    return `Document ${status.charAt(0) + status.slice(1).toLowerCase()}`
  }

  const getInitials = (name: string) => {
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-[#47B2E4] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl font-bold">{getInitials(employer.companyName)}</span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{employer.companyName}</h2>
                
                <div className="flex items-center gap-4 mb-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{employer.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{employer.email}</span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getEmployerTypeColor()}`}
                >
                  <Building2 className="w-3 h-3" />
                  {employer.employerType}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-medium ${getPaymentStatusColor(
                employer.paymentStatus
              )}`}
            >
              {formatPaymentStatus(employer.paymentStatus)}
            </span>
          </div>

          <div className="mb-8 p-6 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Address</p>
                <p className="text-sm text-gray-900">{employer.address || '12/09, Gandhi Street, Mount High way road, Bangalore'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Founded Date</p>
                <p className="text-sm text-gray-900">{employer.foundedDate || '2010'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Size of Employee</p>
                <p className="text-sm text-gray-900">{employer.employeeSize || '100'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">GST Number</p>
                <p className="text-sm text-gray-900">{employer.gstNumber || 'KJ347856437895789HGV'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">CIN Number</p>
                <p className="text-sm text-gray-900">{employer.cinNumber || 'KJ347856437895789HGV'}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 p-6 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Document Details</h3>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                <Scan className="w-4 h-4" />
                Scan Document
              </button>
            </div>

            {employer.documents && employer.documents.length > 0 ? (
              <div className="space-y-3">
                {employer.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getPaymentStatusColor(
                          doc.status
                        )}`}
                      >
                        {doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1.5 hover:bg-green-100 rounded transition-colors">
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                      <button className="p-1.5 hover:bg-red-100 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Company ISO Certificate</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#D4F4DD] text-[#4CAF50]">
                    Verified
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-1.5 hover:bg-green-100 rounded transition-colors">
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button className="p-1.5 hover:bg-red-100 rounded transition-colors">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-6">
              <CheckSquare className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
            </div>

            {employer.paymentHistory && employer.paymentHistory.length > 0 ? (
              <div className="space-y-3">
                {employer.paymentHistory.map((payment, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      payment.status === 'PAID'
                        ? 'bg-[#D4F4DD] text-[#4CAF50]'
                        : 'bg-[#FFF4E5] text-[#FF9800]'
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {payment.description}{' '}
                      {payment.status === 'PAID' && payment.date && `(${payment.date})`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#D4F4DD]">
                <p className="text-sm font-medium text-[#4CAF50]">
                  Employee Subscription 50 Rupee Paid (01/01/2025)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
