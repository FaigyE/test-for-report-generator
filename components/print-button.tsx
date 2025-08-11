"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import type { CustomerInfo, InstallationData, Note } from "@/lib/types"
import ReportCoverPage from "@/components/report-cover-page"
import ReportLetterPage from "@/components/report-letter-page"
import ReportNotesPage from "@/components/report-notes-page"
import ReportDetailPage from "@/components/report-detail-page"

interface PrintButtonProps {
  customerInfo: CustomerInfo
  installationData: InstallationData[]
  toiletCount: number
  notes: Note[]
}

export default function PrintButton({ customerInfo, installationData, toiletCount, notes }: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)

    // Create a new window for printing
    const printWindow = window.open("", "_blank")

    if (!printWindow) {
      alert("Please allow pop-ups to print the report")
      setIsPrinting(false)
      return
    }

    // Get the CSS from the current document
    const styles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n")
        } catch (e) {
          // Ignore CORS errors for external stylesheets
          return ""
        }
      })
      .join("\n")

    // Write the content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Water Conservation Installation Report</title>
          <style>
            ${styles}
            
            @page {
              size: letter;
              margin: 0.5in;
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
              color: black;
            }
            
            .page-break {
              page-break-after: always;
              break-after: page;
              height: 0;
              margin: 0;
              padding: 0;
            }
            
            .report-page {
              position: relative;
              height: 10.5in;
              width: 8in;
              padding: 0.5in;
              margin-bottom: 0.5in;
              page-break-after: always;
              break-after: page;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            th, td {
              border-bottom: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            
            td.text-center {
              text-align: center;
            }
            
            img {
              max-width: 100%;
            }
            
            .footer-container {
              position: absolute;
              bottom: 0.5in;
              left: 0;
              right: 0;
              width: 100%;
            }
            
            .hidden {
              display: block !important;
            }
          </style>
        </head>
        <body>
          <div id="print-container"></div>
          <script>
            // Wait for images to load before printing
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 1000);
            };
          </script>
        </body>
      </html>
    `)

    // Render the components directly in the print window
    const renderInPrintWindow = () => {
      // Get the container
      const container = printWindow.document.getElementById("print-container")
      if (!container) return

      // Create a temporary div to hold our rendered content
      const tempDiv = document.createElement("div")

      // Render each page
      const coverPage = document.createElement("div")
      coverPage.className = "report-page"
      const coverPageComponent = <ReportCoverPage customerInfo={customerInfo} />
      // Use ReactDOM to render the component to the div
      if (typeof window !== "undefined" && window.ReactDOM) {
        window.ReactDOM.render(coverPageComponent, coverPage)
        tempDiv.appendChild(coverPage)
      }

      // Add page break
      const pageBreak1 = document.createElement("div")
      pageBreak1.className = "page-break"
      tempDiv.appendChild(pageBreak1)

      // Letter page
      const letterPage = document.createElement("div")
      letterPage.className = "report-page"
      const letterPageComponent = <ReportLetterPage customerInfo={customerInfo} toiletCount={toiletCount} />
      if (typeof window !== "undefined" && window.ReactDOM) {
        window.ReactDOM.render(letterPageComponent, letterPage)
        tempDiv.appendChild(letterPage)
      }

      // Add page break
      const pageBreak2 = document.createElement("div")
      pageBreak2.className = "page-break"
      tempDiv.appendChild(pageBreak2)

      // Notes page
      const notesPage = document.createElement("div")
      notesPage.className = "report-page"
      const notesPageComponent = <ReportNotesPage notes={notes} isPreview={false} />
      if (typeof window !== "undefined" && window.ReactDOM) {
        window.ReactDOM.render(notesPageComponent, notesPage)
        tempDiv.appendChild(notesPage)
      }

      // Add page break
      const pageBreak3 = document.createElement("div")
      pageBreak3.className = "page-break"
      tempDiv.appendChild(pageBreak3)

      // Details page
      const detailsPage = document.createElement("div")
      detailsPage.className = "report-page"
      const detailsPageComponent = <ReportDetailPage installationData={installationData} isPreview={false} />
      if (typeof window !== "undefined" && window.ReactDOM) {
        window.ReactDOM.render(detailsPageComponent, detailsPage)
        tempDiv.appendChild(detailsPage)
      }

      // Append to container
      container.innerHTML = tempDiv.innerHTML
    }

    // Try to use ReactDOM to render components, but fall back to innerHTML if not available
    try {
      if (typeof window !== "undefined" && window.ReactDOM) {
        renderInPrintWindow()
      } else {
        // Fallback to using the hidden print content
        const printContent = document.querySelector(".print-content")
        if (printContent) {
          const container = printWindow.document.getElementById("print-container")
          if (container) {
            container.innerHTML = printContent.innerHTML
          }
        }
      }
    } catch (error) {
      console.error("Error rendering print content:", error)
      // Fallback to using the hidden print content
      const printContent = document.querySelector(".print-content")
      if (printContent) {
        const container = printWindow.document.getElementById("print-container")
        if (container) {
          container.innerHTML = printContent.innerHTML
        }
      }
    }

    printWindow.document.close()

    // Handle print completion or cancellation
    printWindow.onafterprint = () => {
      setTimeout(() => {
        printWindow.close()
        setIsPrinting(false)
      }, 500)
    }

    // Fallback in case onafterprint doesn't fire
    setTimeout(() => {
      setIsPrinting(false)
    }, 5000)
  }

  return (
    <Button onClick={handlePrint} disabled={isPrinting}>
      <Printer className="mr-2 h-4 w-4" />
      {isPrinting ? "Preparing..." : "Print Report"}
    </Button>
  )
}
