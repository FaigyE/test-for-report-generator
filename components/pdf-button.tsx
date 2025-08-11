"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

interface PdfButtonProps {
  customerName: string
  propertyName: string
}

export default function PdfButton({ customerName, propertyName }: PdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [html2pdfLoaded, setHtml2pdfLoaded] = useState(false)

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

    setIsGenerating(true)

    try {
      // Get the content to convert to PDF
      const content = document.querySelector(".pdf-content") as HTMLElement

      if (!content) {
        throw new Error("PDF content not found")
      }

      // Clone the content to avoid modifying the original
      const clonedContent = content.cloneNode(true) as HTMLElement

      // Make sure all elements are visible in the PDF
      const hiddenElements = clonedContent.querySelectorAll(".hidden")
      hiddenElements.forEach((el) => {
        ;(el as HTMLElement).classList.remove("hidden")
      })

      // Create filename based on customer info
      const filename = `${propertyName.replace(/\s+/g, "-")}_Water_Conservation_Report.pdf`

      // Configure html2pdf options
      const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "in",
          format: "letter",
          orientation: "portrait",
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      }

      // Use the globally loaded html2pdf
      const html2pdf = (window as any).html2pdf
      await html2pdf(clonedContent, options)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("There was an error generating the PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button onClick={handleGeneratePdf} disabled={isGenerating || !html2pdfLoaded}>
      <FileDown className="mr-2 h-4 w-4" />
      {isGenerating ? "Generating PDF..." : html2pdfLoaded ? "Download PDF" : "Loading PDF Generator..."}
    </Button>
  )
}
