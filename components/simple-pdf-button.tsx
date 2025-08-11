"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import type { CustomerInfo, InstallationData } from "@/lib/types"

interface SimplePdfButtonProps {
  customerInfo: CustomerInfo
  installationData: InstallationData[]
  toiletCount: number
}

export default function SimplePdfButton({ customerInfo, installationData, toiletCount }: SimplePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [jsPDFLoaded, setJsPDFLoaded] = useState(false)

  useEffect(() => {
    // Load jsPDF dynamically
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    script.async = true
    script.onload = () => setJsPDFLoaded(true)
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleGeneratePdf = async () => {
    if (!jsPDFLoaded) {
      alert("PDF generator is still loading. Please try again in a moment.")
      return
    }

    try {
      setIsGenerating(true)
      console.log("Starting PDF generation...")

      // Create a new jsPDF instance
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Set font
      doc.setFont("helvetica", "normal")

      // Add title
      doc.setFontSize(20)
      doc.text("Water Conservation Installation Report", 105, 20, { align: "center" })

      // Add customer info
      doc.setFontSize(12)
      doc.text(`Customer: ${customerInfo.customerName}`, 20, 40)
      doc.text(`Property: ${customerInfo.propertyName}`, 20, 50)
      doc.text(`Address: ${customerInfo.address}`, 20, 60)
      doc.text(`${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`, 20, 70)
      doc.text(`Date: ${customerInfo.date}`, 20, 80)

      // Add toilet count
      doc.text(`Total Toilets Installed: ${toiletCount}`, 20, 100)

      // Add installation summary
      doc.setFontSize(16)
      doc.text("Installation Summary", 105, 120, { align: "center" })

      doc.setFontSize(12)
      let yPos = 140

      // Helper function to check if a value indicates an aerator was installed
      const isAeratorInstalled = (value: string) => {
        if (!value) return false
        if (value === "1" || value === "2") return true

        // Check for text values that indicate installation
        const lowerValue = value.toLowerCase()
        return (
          lowerValue.includes("male") ||
          lowerValue.includes("female") ||
          lowerValue.includes("insert") ||
          lowerValue.includes("gpm") ||
          lowerValue.includes("aerator")
        )
      }

      // Count items
      const kitchenAeratorCount = installationData.filter((item) => isAeratorInstalled(item["Kitchen Aerator"])).length
      const bathroomAeratorCount = installationData.filter((item) =>
        isAeratorInstalled(item["Bathroom aerator"]),
      ).length
      const showerHeadCount = installationData.filter((item) => isAeratorInstalled(item["Shower Head"])).length

      doc.text(`Kitchen Aerators Installed: ${kitchenAeratorCount}`, 20, yPos)
      yPos += 10
      doc.text(`Bathroom Aerators Installed: ${bathroomAeratorCount}`, 20, yPos)
      yPos += 10
      doc.text(`Shower Heads Installed: ${showerHeadCount}`, 20, yPos)
      yPos += 10
      doc.text(`Toilets Installed: ${toiletCount}`, 20, yPos)

      // Add a new page for unit details
      doc.addPage()
      doc.setFontSize(16)
      doc.text("Unit Details", 105, 20, { align: "center" })

      // Add unit details
      doc.setFontSize(10)
      yPos = 40

      // Add header row
      doc.text("Unit", 20, yPos)
      doc.text("Toilet", 50, yPos)
      doc.text("Kitchen", 80, yPos)
      doc.text("Bathroom", 110, yPos)
      doc.text("Shower", 140, yPos)
      yPos += 10

      // Add data rows (limit to 20 for testing)
      const limitedData = installationData.slice(0, 20)
      limitedData.forEach((item) => {
        doc.text(item.Unit, 20, yPos)
        doc.text(item["Toilets Installed:  113"] === "1" ? "Yes" : "No", 50, yPos)
        doc.text(item["Kitchen Aerator"] === "1" ? "Yes" : "No", 80, yPos)
        doc.text(item["Bathroom aerator"] === "1" ? "Yes" : "No", 110, yPos)
        doc.text(item["Shower Head"] === "1" ? "Yes" : "No", 140, yPos)
        yPos += 8

        // Add a new page if we're near the bottom
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
      })

      // Save the PDF
      const filename = `${customerInfo.propertyName.replace(/\s+/g, "-")}_Report.pdf`
      console.log("Saving PDF as:", filename)
      doc.save(filename)

      console.log("PDF generation complete!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert(`There was an error generating the PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button onClick={handleGeneratePdf} disabled={isGenerating || !jsPDFLoaded}>
      <FileDown className="mr-2 h-4 w-4" />
      {isGenerating ? "Generating PDF..." : jsPDFLoaded ? "Download Simple PDF" : "Loading PDF Generator..."}
    </Button>
  )
}
