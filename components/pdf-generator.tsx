"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import type { CustomerInfo, InstallationData, Note } from "@/lib/types"
import ReportCoverPage from "@/components/report-cover-page"
import ReportLetterPage from "@/components/report-letter-page"
import ReportNotesPage from "@/components/report-notes-page"
import ReportDetailPage from "@/components/report-detail-page"

interface PdfGeneratorProps {
  customerInfo: CustomerInfo
  installationData: InstallationData[]
  toiletCount: number
  notes: Note[]
}

export default function PdfGenerator({ customerInfo, installationData, toiletCount, notes }: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [html2pdfLoaded, setHtml2pdfLoaded] = useState(false)
  const [showPdfContent, setShowPdfContent] = useState(false)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if html2pdf is already loaded
    if (typeof window !== "undefined" && (window as any).html2pdf) {
      setHtml2pdfLoaded(true)
      return
    }

    // Load html2pdf.js dynamically
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
    script.async = true
    script.onload = () => setHtml2pdfLoaded(true)
    document.body.appendChild(script)

    return () => {
      // Clean up
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleGeneratePdf = async () => {
    if (!html2pdfLoaded) {
      alert("PDF generator is still loading. Please try again in a moment.")
      return
    }

    try {
      setIsGenerating(true)

      // Show the PDF content so it renders properly
      setShowPdfContent(true)

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (!pdfContentRef.current) {
        throw new Error("PDF content reference not found")
      }

      // Create filename based on customer info
      const filename = `${customerInfo.propertyName.replace(/\s+/g, "-")}_Water_Conservation_Report.pdf`

      // Configure html2pdf options
      const options = {
        margin: 10,
        filename: filename,
        image: { type: "jpeg", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: true,
          letterRendering: true,
          allowTaint: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      }

      // Use the globally loaded html2pdf
      const html2pdf = (window as any).html2pdf

      // Generate PDF
      await html2pdf().from(pdfContentRef.current).set(options).save()

      // Hide the PDF content after generation
      setTimeout(() => setShowPdfContent(false), 1000)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert(`There was an error generating the PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
      setShowPdfContent(false)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button onClick={handleGeneratePdf} disabled={isGenerating || !html2pdfLoaded}>
        <FileDown className="mr-2 h-4 w-4" />
        {isGenerating ? "Generating PDF..." : html2pdfLoaded ? "Download PDF" : "Loading PDF Generator..."}
      </Button>

      {/* PDF Content - Only shown during generation */}
      <div
        ref={pdfContentRef}
        className={showPdfContent ? "fixed top-0 left-0 w-full bg-white z-50 p-4" : "hidden"}
        style={{ display: showPdfContent ? "block" : "none" }}
      >
        <div className="pdf-container">
          <ReportCoverPage customerInfo={customerInfo} />
          <div className="page-break"></div>
          <ReportLetterPage customerInfo={customerInfo} toiletCount={toiletCount} />
          <div className="page-break"></div>
          <ReportNotesPage notes={notes} />
          <div className="page-break"></div>
          <ReportDetailPage installationData={installationData} />
        </div>
      </div>
    </>
  )
}
