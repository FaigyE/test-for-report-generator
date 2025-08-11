"use client"

import { useReportContext } from "@/lib/report-context"
import EditableText from "@/components/editable-text"
import ImageUploader from "@/components/image-uploader"
import type { CustomerInfo } from "@/lib/types"

interface ReportCoverPageProps {
  customerInfo: CustomerInfo
  isEditable?: boolean
}

export default function ReportCoverPage({ customerInfo, isEditable = true }: ReportCoverPageProps) {
  const { reportTitle, setReportTitle, setCustomerInfo, setCoverImage, coverImage } = useReportContext()

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    if (isEditable) {
      setCustomerInfo((prev) => {
        const updated = { ...prev, [field]: value }
        console.log(`Updated ${field} to "${value}"`, updated)
        return updated
      })
    }
  }

  const handleCoverImageUpload = (imageDataUrl: string) => {
    if (isEditable) {
      setCoverImage(imageDataUrl || null)
    }
  }

  return (
    <div className="report-page min-h-[1056px] relative">
      {/* Header with logo - made bigger and higher up */}
      <div className="mb-8">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
          alt="GreenLight Logo"
          className="h-24"
          crossOrigin="anonymous"
        />
      </div>

      {/* Cover page content */}
      <div className="flex flex-col items-center justify-center h-[800px]">
        <h1 className="text-3xl font-bold mb-8">
          {isEditable ? (
            <EditableText
              value={reportTitle}
              onChange={(value) => {
                setReportTitle(value)
              }}
              className="text-3xl font-bold text-center"
              placeholder="Report Title"
            />
          ) : (
            reportTitle
          )}
        </h1>

        <p className="text-xl font-bold mb-8">
          {isEditable ? (
            <EditableText
              value={`${customerInfo.address} ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`}
              onChange={(value) => {
                // This is a simplified approach - in a real app, you might want to parse the address
                const parts = value.split(",")
                if (parts.length >= 2) {
                  const addressPart = parts[0].trim()
                  const locationPart = parts[1].trim().split(" ")
                  const zip = locationPart.pop() || ""
                  const state = locationPart.pop() || ""
                  const city = locationPart.join(" ")

                  handleCustomerInfoChange("address", addressPart)
                  handleCustomerInfoChange("city", city)
                  handleCustomerInfoChange("state", state)
                  handleCustomerInfoChange("zip", zip)
                }
              }}
              placeholder="Address, City, State ZIP"
            />
          ) : (
            `${customerInfo.address} ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`
          )}
        </p>

        {/* Image upload section - positioned between address and ATTN */}
        <div className="mb-12 w-full flex flex-col items-center">
          

          {coverImage && (
            <div className="w-full flex justify-center">
              <img
                src={coverImage || "/placeholder.svg"}
                alt="Cover"
                className="object-contain border rounded"
                style={{
                  width: "85%",
                  aspectRatio: "16/9",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </div>

        <div className="text-center mb-16">
          <p className="text-lg mb-4">ATTN:</p>
          {isEditable ? (
            <>
              <p className="text-xl font-bold mb-1">
                <EditableText
                  value={customerInfo.customerName}
                  onChange={(value) => handleCustomerInfoChange("customerName", value)}
                  placeholder="Customer Name"
                />
              </p>
              <p className="text-xl font-bold mb-1">
                <EditableText
                  value={customerInfo.propertyName}
                  onChange={(value) => handleCustomerInfoChange("propertyName", value)}
                  placeholder="Property Name"
                />
              </p>
              <p className="text-xl font-bold mb-1">
                <EditableText
                  value={`${customerInfo.address} ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`}
                  onChange={(value) => {
                    // This is a simplified approach - in a real app, you might want to parse the address
                    const parts = value.split(",")
                    if (parts.length >= 2) {
                      const addressPart = parts[0].trim()
                      const locationPart = parts[1].trim().split(" ")
                      const zip = locationPart.pop() || ""
                      const state = locationPart.pop() || ""
                      const city = locationPart.join(" ")

                      handleCustomerInfoChange("address", addressPart)
                      handleCustomerInfoChange("city", city)
                      handleCustomerInfoChange("state", state)
                      handleCustomerInfoChange("zip", zip)
                    }
                  }}
                  placeholder="Address, City, State ZIP"
                />
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-1">{customerInfo.customerName}</p>
              <p className="text-xl font-bold mb-1">{customerInfo.propertyName}</p>
              <p className="text-xl font-bold mb-1">
                {customerInfo.address} {customerInfo.city}, {customerInfo.state} {customerInfo.zip}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer - full width */}
      <div className="footer-container">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115454-uWCS2yWrowegSqw9c2SIVcLdedTk82.png"
          alt="GreenLight Footer"
          className="w-full h-auto"
          crossOrigin="anonymous"
        />
      </div>

      {/* Page number */}
      <div className="absolute top-4 right-4 text-sm">Page 1 of 21</div>
    </div>
  )
}
