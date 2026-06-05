'use client'

import { X, Phone, Mail, User, Briefcase, FileText, Eye, Check, Trash2, Scan, Send } from 'lucide-react'
import Image from 'next/image'

interface EmployeeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  employee: {
    id: string
    name: string
    phoneNumber: string
    email: string
    language: string
    location: string
    documentStatus: 'VERIFIED' | 'PENDING' | 'REJECTED'
    paymentStatus: 'PAID' | 'NOT_PAID' | 'PENDING'
    profilePhoto?: string
    jobSector?: string
    jobCategory?: string
    workExperience?: {
      position: string
      company: string
      startDate: string
      endDate: string
    }[]
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

export default function EmployeeDetailModal({ isOpen, onClose, employee }: EmployeeDetailModalProps) {
  if (!isOpen) return null

  const getDocumentStatusColor = (status: string) => {
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-[#D4F4DD] text-[#4CAF50]'
      case 'PENDING':
        return 'bg-[#FFF4E5] text-[#FF9800]'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDocumentStatus = (status: string) => {
    return `Document ${status.charAt(0) + status.slice(1).toLowerCase()}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 mb-4">
              {employee.profilePhoto ? (
                <Image
                  src={employee.profilePhoto}
                  alt={employee.name}
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary-50 flex items-center justify-center">
                  <User className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">{employee.name}</h2>

            <div className="flex items-center gap-6 mb-3 text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{employee.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{employee.email}</span>
              </div>
            </div>

            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${getDocumentStatusColor(
                employee.documentStatus
              )}`}
            >
              {formatDocumentStatus(employee.documentStatus)}
            </span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Language</p>
                <p className="text-sm font-medium text-gray-900">{employee.language}</p>
              </div>
              {employee.jobSector && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Job Sector</p>
                  <p className="text-sm font-medium text-gray-900">{employee.jobSector}</p>
                </div>
              )}
              {employee.jobCategory && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Job Category</p>
                  <p className="text-sm font-medium text-gray-900">{employee.jobCategory}</p>
                </div>
              )}
            </div>
          </div>

          {employee.workExperience && employee.workExperience.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
              </div>
              <div className="space-y-3">
                {employee.workExperience.map((exp, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">
                      {exp.position} at {exp.company}
                    </p>
                    <p className="text-sm text-gray-500">
                      {exp.startDate} - {exp.endDate}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Document</h3>
              </div>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  employee.documentStatus === 'REJECTED'
                    ? 'bg-primary-50 text-white hover:bg-primary-60'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Scan className="w-4 h-4" />
                Scan Document
              </button>
            </div>

            {employee.documents && employee.documents.length > 0 && (
              <div className="space-y-3">
                {employee.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDocumentStatusColor(
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
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              </div>
              {employee.paymentStatus === 'PENDING' && (
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                  <Send className="w-4 h-4" />
                  Send Reminder
                </button>
              )}
            </div>

            {employee.paymentHistory && employee.paymentHistory.length > 0 && (
              <div className="space-y-3">
                {employee.paymentHistory.map((payment, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${getPaymentStatusColor(payment.status)}`}
                  >
                    <p className="text-sm font-medium">
                      {payment.description}{' '}
                      {payment.status === 'PAID' && `(${payment.date})`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
