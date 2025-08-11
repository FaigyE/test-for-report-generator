"use client"

import { useReportContext } from "@/lib/report-context"
import EditableText from "@/components/editable-text"
import type { CustomerInfo } from "@/lib/types"

interface ReportLetterPageProps {
  customerInfo: CustomerInfo
  toiletCount: number
  isEditable?: boolean
}

export default function ReportLetterPage({ customerInfo, toiletCount, isEditable = true }: ReportLetterPageProps) {
  const {
    letterText,
    setLetterText,
    signatureName,
    setSignatureName,
    signatureTitle,
    setSignatureTitle,
    setCustomerInfo,
    // Remove: setHasUnsavedChanges,
    // Add new editable text elements
    rePrefix,
    setRePrefix,
    dearPrefix,
    setDearPrefix,
  } = useReportContext()

  const handleLetterTextChange = (index: number, value: string) => {
    if (isEditable) {
      const newLetterText = [...letterText]
      newLetterText[index] = value
      setLetterText(newLetterText)
      // Remove this line:
      // setHasUnsavedChanges(true)
      console.log(`Updated letter text at index ${index} to "${value}"`)
    }
  }

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    if (isEditable) {
      setCustomerInfo((prev) => {
        const updated = { ...prev, [field]: value }
        console.log(`Updated ${field} to "${value}"`, updated)
        return updated
      })
      // Remove this line:
      // setHasUnsavedChanges(true)
    }
  }

  // Replace {toiletCount} placeholder with actual count
  const processedLetterText = letterText.map((text) => text.replace(/\{toiletCount\}/g, toiletCount.toString()))

  return (
    <div className="report-page min-h-[1056px] relative">
      {/* Header with logo - made bigger and higher up */}
      <div className="mb-8">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
          alt="GreenLight Logo"
          className="h-24" // Increased from h-16
          crossOrigin="anonymous"
        />
      </div>

      {/* Letter content */}
      <div className="mb-16">
        <p className="mb-4">
          {isEditable ? (
            <EditableText
              value={customerInfo.date}
              onChange={(value) => handleCustomerInfoChange("date", value)}
              placeholder="Date"
            />
          ) : (
            customerInfo.date
          )}
        </p>
        <p className="mb-1">
          {isEditable ? (
            <EditableText
              value={customerInfo.propertyName}
              onChange={(value) => handleCustomerInfoChange("propertyName", value)}
              placeholder="Property Name"
            />
          ) : (
            customerInfo.propertyName
          )}
        </p>
        <p className="mb-1">
          {isEditable ? (
            <EditableText
              value={customerInfo.customerName}
              onChange={(value) => handleCustomerInfoChange("customerName", value)}
              placeholder="Customer Name"
            />
          ) : (
            customerInfo.customerName
          )}
        </p>
        <p className="mb-1">
          {isEditable ? (
            <span className="flex">
              <EditableText
                value={rePrefix}
                onChange={(value) => {
                  setRePrefix(value)
                }}
                placeholder="RE:"
                className="mr-1"
              />
              <EditableText
                value={customerInfo.address}
                onChange={(value) => handleCustomerInfoChange("address", value)}
                placeholder="Address"
              />
            </span>
          ) : (
            <>
              {rePrefix} {customerInfo.address}
            </>
          )}
        </p>
        <p className="mb-8">
          {isEditable ? (
            <EditableText
              value={`${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`}
              onChange={(value) => {
                // This is a simplified approach - in a real app, you might want to parse the address
                const parts = value.split(",")
                if (parts.length >= 2) {
                  const locationPart = parts[1].trim().split(" ")
                  const zip = locationPart.pop() || ""
                  const state = locationPart.pop() || ""
                  const city = locationPart.join(" ")

                  handleCustomerInfoChange("city", city)
                  handleCustomerInfoChange("state", state)
                  handleCustomerInfoChange("zip", zip)
                }
              }}
              placeholder="City, State ZIP"
            />
          ) : (
            `${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`
          )}
        </p>

        <p className="mb-2">
          {isEditable ? (
            <span className="flex">
              <EditableText
                value={dearPrefix}
                onChange={(value) => {
                  setDearPrefix(value)
                }}
                placeholder="Dear"
                className="mr-1"
              />
              <EditableText
                value={customerInfo.customerName.split(" ")[0]}
                onChange={(value) => {
                  const nameParts = customerInfo.customerName.split(" ")
                  nameParts[0] = value
                  handleCustomerInfoChange("customerName", nameParts.join(" "))
                }}
                placeholder="First Name"
              />
              <span>,</span>
            </span>
          ) : (
            <>
              {dearPrefix} {customerInfo.customerName.split(" ")[0]},
            </>
          )}
        </p>

        {letterText.map((originalText, index) => {
          // Process the text to replace placeholders for display
          const displayText = originalText.replace(/\{toiletCount\}/g, toiletCount.toString())

          return (
            <p key={index} className="mb-4">
              {isEditable ? (
                <EditableText
                  value={originalText} // Edit the original text with placeholders
                  displayValue={displayText} // Show the processed text
                  onChange={(value) => handleLetterTextChange(index, value)}
                  multiline={true}
                  placeholder={`Paragraph ${index + 1}`}
                />
              ) : (
                displayText // Use the processed text for display
              )}
            </p>
          )
        })}

        <p className="mb-1">Very truly yours,</p>

        {/* Add signature image */}
        <div className="my-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VtZjpVdUqjQTct2lQsw6FsvfgvFeiU.png"
            alt="Signature"
            className="h-10 ml-1" // Reduced from h-16 to h-10
            crossOrigin="anonymous"
          />
        </div>

        <p className="mb-1">
          {isEditable ? (
            <EditableText
              value={signatureName}
              onChange={(value) => {
                setSignatureName(value)
              }}
              placeholder="Signature Name"
            />
          ) : (
            signatureName
          )}
        </p>
        <p>
          {isEditable ? (
            <EditableText
              value={signatureTitle}
              onChange={(value) => {
                setSignatureTitle(value)
              }}
              placeholder="Signature Title"
            />
          ) : (
            signatureTitle
          )}
        </p>
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
      <div className="absolute top-4 right-4 text-sm">Page 2 of 21</div>
    </div>
  )
}
