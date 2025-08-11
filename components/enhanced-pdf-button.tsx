"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import type { CustomerInfo, InstallationData, Note } from "@/lib/types"
import { useReportContext } from "@/lib/report-context"
// Import the formatNote function
import { getAeratorDescription, formatNote } from "@/lib/utils/aerator-helpers"
import { getStoredNotes, getFinalNoteForUnit } from "@/lib/notes"

interface EnhancedPdfButtonProps {
  customerInfo: CustomerInfo
  installationData: InstallationData[]
  toiletCount: number
  notes: Note[]
}

export default function EnhancedPdfButton({
  customerInfo,
  installationData,
  toiletCount,
  notes,
}: EnhancedPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [jsPDFLoaded, setJsPDFLoaded] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [footerLoaded, setFooterLoaded] = useState(false)
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [footerImage, setFooterImage] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [signatureLoaded, setSignatureLoaded] = useState(false)
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [editedDetailNotes, setEditedDetailNotes] = useState<Record<string, string>>({})
  // Add state to track edited installations
  // Add after the editedDetailNotes state declaration
  const [editedInstallations, setEditedInstallations] = useState<Record<string, Record<string, string>>>({})
  // Add state for edited report notes (similar to detail notes)
  const [editedReportNotes, setEditedReportNotes] = useState<Note[]>([])
  // Add state for column headers
  const [columnHeaders, setColumnHeaders] = useState({
    unit: "Unit",
    kitchen: "Kitchen\nInstalled",
    bathroom: "Bathroom\nInstalled",
    shower: "Shower\nInstalled",
    toilet: "Toilet\nInstalled",
    notes: "Notes",
  })
  // Add state for edited units
  const [editedUnits, setEditedUnits] = useState<Record<string, string>>({})

  // Get the latest state from context
  const {
    reportTitle,
    letterText,
    signatureName,
    signatureTitle,
    rePrefix,
    dearPrefix,
    sectionTitles,
    coverImage,
    coverImageSize,
    notes: contextNotes, // Add this to get the latest notes from context
  } = useReportContext()

  // Load unified notes from localStorage
  useEffect(() => {
    const storedNotes = getStoredNotes()
    setEditedDetailNotes(storedNotes)
    console.log("PDF: Loaded unified notes from localStorage:", storedNotes)
  }, [])

  // Listen for unified notes updates
  useEffect(() => {
    const handleNotesUpdate = () => {
      console.log("PDF: Received unified notes update event")
      const storedNotes = getStoredNotes()
      setEditedDetailNotes(storedNotes)
    }

    window.addEventListener("unifiedNotesUpdated", handleNotesUpdate)
    return () => window.removeEventListener("unifiedNotesUpdated", handleNotesUpdate)
  }, [])

  // Load edited installations from localStorage
  // Add after the useEffect for loading edited notes
  useEffect(() => {
    const storedInstallations = localStorage.getItem("detailInstallations")
    if (storedInstallations) {
      try {
        const parsedInstallations = JSON.parse(storedInstallations)
        setEditedInstallations(parsedInstallations)
        console.log("PDF: Loaded edited installations from localStorage:", parsedInstallations)
      } catch (error) {
        console.error("PDF: Error parsing stored installations:", error)
      }
    }
  }, [])

  // Load edited report notes from localStorage
  useEffect(() => {
    const storedReportNotes = localStorage.getItem("reportNotes")
    if (storedReportNotes) {
      try {
        const parsedReportNotes = JSON.parse(storedReportNotes)
        setEditedReportNotes(parsedReportNotes)
        console.log("PDF: Loaded edited report notes from localStorage:", parsedReportNotes)
      } catch (error) {
        console.error("PDF: Error parsing stored report notes:", error)
      }
    }
  }, [])

  // Load column headers from localStorage
  useEffect(() => {
    const storedHeaders = localStorage.getItem("columnHeaders")
    if (storedHeaders) {
      try {
        const parsedHeaders = JSON.parse(storedHeaders)
        setColumnHeaders(parsedHeaders)
        console.log("PDF: Loaded column headers from localStorage:", parsedHeaders)
      } catch (error) {
        console.error("PDF: Error parsing stored column headers:", error)
      }
    }
  }, [])

  // Load edited units from localStorage
  useEffect(() => {
    const storedUnits = localStorage.getItem("editedUnits")
    if (storedUnits) {
      try {
        const parsedUnits = JSON.parse(storedUnits)
        setEditedUnits(parsedUnits)
        console.log("PDF: Loaded edited units from localStorage:", parsedUnits)
      } catch (error) {
        console.error("PDF: Error parsing stored units:", error)
      }
    }
  }, [])

  useEffect(() => {
    // Load jsPDF dynamically
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    script.async = true
    script.onload = () => setJsPDFLoaded(true)
    document.body.appendChild(script)

    // Load logo image
    const logoImg = new Image()
    logoImg.crossOrigin = "anonymous"
    logoImg.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = logoImg.width
      canvas.height = logoImg.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(logoImg, 0, 0)
      setLogoImage(canvas.toDataURL("image/png"))
      setLogoLoaded(true)
    }
    logoImg.src =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"

    // Load footer image
    const footerImg = new Image()
    footerImg.crossOrigin = "anonymous"
    footerImg.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = footerImg.width
      canvas.height = footerImg.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(footerImg, 0, 0)
      setFooterImage({
        dataUrl: canvas.toDataURL("image/png"),
        width: footerImg.width,
        height: footerImg.height,
      })
      setFooterLoaded(true)
    }
    footerImg.src =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115454-uWCS2yWrowegSqw9c2SIVcLdedTk82.png"

    // Load signature image
    const signatureImg = new Image()
    signatureImg.crossOrigin = "anonymous"
    signatureImg.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = signatureImg.width
      canvas.height = signatureImg.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(signatureImg, 0, 0)
      setSignatureImage(canvas.toDataURL("image/png"))
      setSignatureLoaded(true)
    }
    signatureImg.src =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VtZjpVdUqjQTct2lQsw6FsvfgvFeiU.png"

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Add this helper function inside the component
  // Helper function to find the toilet column and check if installed
  const getToiletColumnInfo = (item: InstallationData): { installed: boolean; columnName: string | null } => {
    // Find the toilet column by looking for keys that start with "Toilets Installed:"
    const toiletColumn = Object.keys(item).find((key) => key.startsWith("Toilets Installed:"))

    if (toiletColumn && item[toiletColumn] && item[toiletColumn] !== "") {
      return { installed: true, columnName: toiletColumn }
    }

    return { installed: false, columnName: null }
  }

  // Replace the hasToiletInstalled function with this
  const hasToiletInstalled = (item: InstallationData): boolean => {
    return getToiletColumnInfo(item).installed
  }

  // Updated findColumnName function to prioritize columns with data - same as detail page
  const findColumnName = (possibleNames: string[]): string | null => {
    if (!installationData || installationData.length === 0) return null

    console.log("PDF: Looking for columns:", possibleNames)
    console.log("PDF: Available columns:", Object.keys(installationData[0]))

    // First, find all matching columns (both exact and partial matches)
    const matchingColumns: { key: string; hasData: boolean; dataCount: number; sampleValues: string[] }[] = []

    for (const key of Object.keys(installationData[0])) {
      let isMatch = false

      // Check for exact match
      if (possibleNames.includes(key)) {
        isMatch = true
      }

      // Check for case-insensitive match
      if (!isMatch) {
        for (const possibleName of possibleNames) {
          if (key.toLowerCase() === possibleName.toLowerCase()) {
            isMatch = true
            break
          }
        }
      }

      // Check for partial match
      if (!isMatch) {
        for (const possibleName of possibleNames) {
          if (
            key.toLowerCase().includes(possibleName.toLowerCase()) ||
            possibleName.toLowerCase().includes(key.toLowerCase())
          ) {
            isMatch = true
            break
          }
        }
      }

      if (isMatch) {
        // Count how many rows have meaningful data in this column
        const meaningfulValues = installationData
          .map((item) => item[key])
          .filter((value) => {
            if (!value) return false
            const trimmed = String(value).trim().toLowerCase()
            // Consider it meaningful if it's not empty, not "0", not "no", not "n/a", not "na"
            return (
              trimmed !== "" &&
              trimmed !== "0" &&
              trimmed !== "no" &&
              trimmed !== "n/a" &&
              trimmed !== "na" &&
              trimmed !== "none"
            )
          })

        const dataCount = meaningfulValues.length
        const sampleValues = meaningfulValues.slice(0, 5).map((v) => String(v)) // Get first 5 sample values

        matchingColumns.push({
          key,
          hasData: dataCount > 0,
          dataCount,
          sampleValues,
        })

        console.log(
          `PDF: Found matching column "${key}" with ${dataCount} meaningful data entries. Sample values:`,
          sampleValues,
        )
      }
    }

    if (matchingColumns.length === 0) {
      console.log("PDF: No matching columns found")
      return null
    }

    // Sort by data count (descending) to prioritize columns with more meaningful data
    matchingColumns.sort((a, b) => b.dataCount - a.dataCount)

    const selectedColumn = matchingColumns[0].key
    console.log(`PDF: Selected column "${selectedColumn}" with ${matchingColumns[0].dataCount} meaningful data entries`)
    console.log(`PDF: Sample values from selected column:`, matchingColumns[0].sampleValues)

    return selectedColumn
  }

  const handleGeneratePdf = async () => {
    // Add this function to find the unit column
    const findUnitColumn = (data: InstallationData[]): string | null => {
      if (!data || data.length === 0) return null

      const item = data[0]

      // Log all column names for debugging
      console.log("PDF: All column names for unit detection:", Object.keys(item))

      // First, look specifically for "BLDG/Unit" (case-insensitive)
      for (const key of Object.keys(item)) {
        if (key.toLowerCase() === "bldg/unit" || key.toLowerCase() === "bldg/unit") {
          console.log(`PDF: Found exact match for BLDG/Unit column: ${key}`)
          return key
        }
      }

      // Then look for columns containing both "bldg" and "unit"
      for (const key of Object.keys(item)) {
        const keyLower = key.toLowerCase()
        if (keyLower.includes("bldg") && keyLower.includes("unit")) {
          console.log(`PDF: Found column containing both BLDG and Unit: ${key}`)
          return key
        }
      }

      // Then look for any column containing "unit" or "apt" or "apartment"
      const unitKeywords = ["unit", "apt", "apartment", "room", "number"]
      for (const key of Object.keys(item)) {
        const keyLower = key.toLowerCase()
        for (const keyword of unitKeywords) {
          if (keyLower.includes(keyword)) {
            console.log(`PDF: Found column containing ${keyword}: ${key}`)
            return key
          }
        }
      }

      // If no suitable column found, use the first column as a fallback
      // This assumes the first column is likely to be the unit identifier
      const firstKey = Object.keys(item)[0]
      console.log(`PDF: No unit column found, using first column as fallback: ${firstKey}`)
      return firstKey
    }

    if (!jsPDFLoaded || !logoLoaded || !footerLoaded) {
      alert("PDF generator or images are still loading. Please try again in a moment.")
      return
    }

    try {
      setIsGenerating(true)
      console.log("Starting enhanced PDF generation...")
      console.log("Using context values:", {
        reportTitle,
        letterText,
        signatureName,
        signatureTitle,
        rePrefix,
        dearPrefix,
        sectionTitles,
      })

      // Find the unit column first
      const unitColumn = findUnitColumn(installationData)
      console.log("PDF: Using unit column:", unitColumn)

      // Get the actual column names from the data - MOVE THIS TO THE TOP
      const kitchenAeratorColumn = findColumnName(["Kitchen Aerator", "kitchen aerator", "kitchen", "kitchen aerators"])
      const bathroomAeratorColumn = findColumnName([
        "Bathroom aerator",
        "bathroom aerator",
        "bathroom",
        "bathroom aerators",
        "bath aerator",
      ])
      const showerHeadColumn = findColumnName(["Shower Head", "shower head", "shower", "shower heads"])

      console.log("PDF: Found column names:", {
        kitchenAeratorColumn,
        bathroomAeratorColumn,
        showerHeadColumn,
      })

      // Load the latest edited units from localStorage right before generating the PDF
      let latestEditedUnits: Record<string, string> = {}
      try {
        const storedUnits = localStorage.getItem("editedUnits")
        if (storedUnits) {
          latestEditedUnits = JSON.parse(storedUnits)
          console.log("PDF: Loaded latest edited units from localStorage:", latestEditedUnits)
        }
      } catch (error) {
        console.error("PDF: Error parsing stored units:", error)
      }

      // Load the latest unified notes from localStorage right before generating the PDF
      let latestEditedNotes: Record<string, string> = {}
      try {
        latestEditedNotes = getStoredNotes()
        console.log("PDF: Loaded latest unified notes from localStorage:", latestEditedNotes)
      } catch (error) {
        console.error("PDF: Error loading unified notes:", error)
      }

      // Load the latest edited installations from localStorage right before generating the PDF
      let latestEditedInstallations: Record<string, Record<string, string>> = {}
      try {
        const storedInstallations = localStorage.getItem("detailInstallations")
        if (storedInstallations) {
          latestEditedInstallations = JSON.parse(storedInstallations)
          console.log("PDF: Loaded latest edited installations from localStorage:", latestEditedInstallations)
        }
      } catch (error) {
        console.error("PDF: Error parsing stored installations:", error)
      }

      // Load the latest column headers from localStorage
      let latestColumnHeaders = { ...columnHeaders }
      try {
        const storedHeaders = localStorage.getItem("columnHeaders")
        if (storedHeaders) {
          latestColumnHeaders = JSON.parse(storedHeaders)
          console.log("PDF: Loaded latest column headers from localStorage:", latestColumnHeaders)
        }
      } catch (error) {
        console.error("PDF: Error parsing stored column headers:", error)
      }

      // Load the latest edited report notes from localStorage - UPDATED VERSION
      let latestReportNotes: Note[] = []
      try {
        // Load from localStorage first (most recent changes)
        const storedReportNotes = localStorage.getItem("reportNotes")
        if (storedReportNotes) {
          latestReportNotes = JSON.parse(storedReportNotes)
          console.log("PDF: Loaded report notes from localStorage:", latestReportNotes)
        } else if (contextNotes && contextNotes.length > 0) {
          // Fallback to context notes
          latestReportNotes = [...contextNotes]
          console.log("PDF: Using context notes as fallback:", latestReportNotes)
        } else {
          // Final fallback to props
          latestReportNotes = [...notes]
          console.log("PDF: Using props notes as final fallback:", latestReportNotes)
        }

        // Always sort the notes to ensure consistent ordering
        latestReportNotes = latestReportNotes.sort((a, b) => {
          const unitA = a.unit || ""
          const unitB = b.unit || ""

          // Try to parse as numbers first
          const numA = Number.parseInt(unitA)
          const numB = Number.parseInt(unitB)

          // If both are valid numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }

          // Otherwise, sort alphabetically
          return unitA.localeCompare(unitB, undefined, { numeric: true, sensitivity: "base" })
        })

        console.log("PDF: Final sorted report notes for PDF:", latestReportNotes)
      } catch (error) {
        console.error("PDF: Error processing report notes:", error)
        // Fallback to props if everything fails
        latestReportNotes = [...notes]
      }

      // Filter out rows without valid unit numbers and apply edits
      const filteredData = (() => {
        const result = []

        console.log("PDF: Starting to process installation data...")
        console.log("PDF: Total rows to process:", installationData.length)

        for (let i = 0; i < installationData.length; i++) {
          const item = installationData[i]

          // Get the unit value
          const unitValue = unitColumn ? item[unitColumn] : item.Unit

          // Log each row for debugging
          console.log(
            `PDF Row ${i + 1}: Unit="${unitValue}" (type: ${typeof unitValue}, length: ${unitValue ? unitValue.length : "null"})`,
          )

          // Check if unit is truly empty - be very strict about this
          if (
            unitValue === undefined ||
            unitValue === null ||
            unitValue === "" ||
            (typeof unitValue === "string" && unitValue.trim() === "")
          ) {
            console.log(
              `PDF STOPPING: Found empty unit at row ${i + 1}. Unit value: "${unitValue}". Processed ${result.length} valid rows.`,
            )
            break // Stop processing immediately when we find an empty unit
          }

          // Convert to string and trim for further checks
          const trimmedUnit = String(unitValue).trim()

          // If after trimming it's empty, stop
          if (trimmedUnit === "") {
            console.log(
              `PDF STOPPING: Found empty unit after trimming at row ${i + 1}. Original: "${unitValue}". Processed ${result.length} valid rows.`,
            )
            break
          }

          // Check if this unit has been marked for deletion (only if completely blank)
          if (latestEditedUnits[trimmedUnit] === "") {
            console.log(`PDF: Skipping deleted unit "${trimmedUnit}" (marked as completely blank)`)
            continue
          }

          // Filter out rows with non-apartment values (often headers, totals, etc.) but be more specific
          const lowerUnit = trimmedUnit.toLowerCase()
          const invalidValues = [
            "total",
            "sum",
            "average",
            "avg",
            "count",
            "header",

            "grand total",
            "subtotal",
          ]

          // Check if the entire unit value matches invalid patterns
          const isInvalidUnit = invalidValues.some((val) => lowerUnit === val || lowerUnit.includes(val))

          // Also check if this looks like a summary row by examining other columns
          const hasInstallationData =
            (kitchenAeratorColumn && item[kitchenAeratorColumn] && item[kitchenAeratorColumn] !== "") ||
            (bathroomAeratorColumn && item[bathroomAeratorColumn] && item[bathroomAeratorColumn] !== "") ||
            (showerHeadColumn && item[showerHeadColumn] && item[showerHeadColumn] !== "") ||
            hasToiletInstalled(item)

          const hasLeakData =
            item["Leak Issue Kitchen Faucet"] || item["Leak Issue Bath Faucet"] || item["Tub Spout/Diverter Leak Issue"]

          // Only skip if it's clearly an invalid unit AND has no relevant data
          if (isInvalidUnit && !hasInstallationData && !hasLeakData) {
            console.log(
              `PDF: Skipping invalid unit "${trimmedUnit}" at row ${i + 1} (contains: ${invalidValues.find((val) => lowerUnit.includes(val))} and no relevant data)`,
            )
            continue // Skip this row but continue processing
          }

          console.log(`PDF: Adding valid unit: "${trimmedUnit}"`)
          result.push(item)
        }

        console.log(`PDF: Final result: ${result.length} valid units processed`)

        // Sort the results by unit number in ascending order
        return result.sort((a, b) => {
          const unitA = unitColumn ? a[unitColumn] : a.Unit
          const unitB = unitColumn ? b[unitColumn] : b.Unit

          // Get edited unit numbers if they exist
          const finalUnitA = unitA && latestEditedUnits[unitA] !== undefined ? latestEditedUnits[unitA] : unitA || ""
          const finalUnitB = unitB && latestEditedUnits[unitB] !== undefined ? latestEditedUnits[unitB] : unitB || ""

          // Try to parse as numbers first
          const numA = Number.parseInt(finalUnitA)
          const numB = Number.parseInt(finalUnitB)

          // If both are valid numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }

          // Otherwise, sort alphabetically
          return finalUnitA.localeCompare(finalUnitB, undefined, { numeric: true, sensitivity: "base" })
        })
      })()

      console.log(`PDF: Processed ${filteredData.length} valid units (stopped at first empty unit, sorted ascending)`)

      console.log("Using edited installations:", latestEditedInstallations)
      console.log("Using column headers:", latestColumnHeaders)
      console.log("Using edited detail notes:", latestEditedNotes)
      console.log("Using report notes:", latestReportNotes)

      // Create a new jsPDF instance
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      })

      // Set font
      doc.setFont("helvetica", "normal")

      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Calculate logo and footer dimensions
      // Make logo bigger and higher up, and move it more to the left
      const logoWidth = 90 // Increased from 70
      const logoHeight = 27 // Increased proportionally
      const logoX = 5 // Moved more to the left (from 15)
      const logoY = 5 // Moved higher up from 10

      // Calculate the position where content should start (below the logo with some margin)
      const contentStartY = logoY + logoHeight + 5 // Increased from 10 to 15mm margin below the logo

      // Calculate footer dimensions to fill the entire page width
      const footerWidth = pageWidth
      let footerHeight = 20 // Default height if we can't calculate
      let footerAspectRatio = 180 / 20 // Default aspect ratio if we can't calculate

      // Get the actual aspect ratio from the loaded image
      if (footerImage) {
        const tempImg = new Image()
        tempImg.src = footerImage.dataUrl
        if (tempImg.width && tempImg.height) {
          footerAspectRatio = tempImg.width / tempImg.height
        }
      }

      // Calculate height based on actual aspect ratio
      footerHeight = footerWidth / footerAspectRatio
      const footerX = 0
      const footerY = pageHeight - footerHeight

      // Calculate the available space for content on each page
      const safeBottomMargin = 15 // Safety margin at the bottom of the page
      const availableHeight = pageHeight - contentStartY - footerHeight - safeBottomMargin

      // Helper function to add header and footer to each page
      const addHeaderFooter = (pageNum: number, totalPages: number) => {
        // Add logo
        if (logoImage) {
          doc.addImage(logoImage, "PNG", logoX, logoY, logoWidth, logoHeight)
        }

        // Add footer - full width of the page with correct aspect ratio
        if (footerImage) {
          const footerWidth = pageWidth
          const footerHeight = pageWidth * (footerImage.height / footerImage.width)
          const footerX = 0
          const footerY = pageHeight - footerHeight
          doc.addImage(footerImage.dataUrl, "PNG", footerX, footerY, footerWidth, footerHeight)
        }

        // Add page number - aligned with the logo vertically
        doc.setFontSize(10)
        doc.text(`Page ${pageNum} of ${totalPages}`, 190, logoY + 10, { align: "right" }) // Aligned with logo
      }

      // Calculate total pages based on data
      // This is an estimate and will be updated as we generate the PDF
      let totalPages = 2 // Cover page + letter page

      // Estimate notes pages
      const filteredNotes = latestReportNotes
        .filter((note) => {
          if (!note.unit || note.unit.trim() === "") return false
          const lowerUnit = note.unit.toLowerCase()
          const invalidValues = ["total", "sum", "average", "avg", "count", "header", "n/a", "na"]
          if (invalidValues.some((val) => lowerUnit.includes(val))) return false
          return true
        })
        .sort((a, b) => {
          const unitA = a.unit || ""
          const unitB = b.unit || ""

          // Try to parse as numbers first
          const numA = Number.parseInt(unitA)
          const numB = Number.parseInt(unitB)

          // If both are valid numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }

          // Otherwise, sort alphabetically
          return unitA.localeCompare(unitB, undefined, { numeric: true, sensitivity: "base" })
        })

      // Estimate how many notes can fit on a page
      const estimatedNotesPerPage = Math.floor(availableHeight / 10) // Assuming 10mm per note
      const estimatedNotesPages = filteredNotes.length > 0 ? Math.ceil(filteredNotes.length / estimatedNotesPerPage) : 0
      totalPages += estimatedNotesPages

      // Estimate detail pages
      const estimatedRowsPerPage = Math.floor(availableHeight / 10) // Assuming 10mm per row
      const estimatedDetailPages = Math.ceil(filteredData.length / estimatedRowsPerPage)
      totalPages += estimatedDetailPages

      // Cover Page
      addHeaderFooter(1, totalPages)

      doc.setFontSize(24)
      doc.setTextColor("#1F497D")
      doc.text(reportTitle, 105, 50, { align: "center" })
      doc.setDrawColor("#1F497D")
      doc.line(20, 65, 190, 65)

      // Add the address
      doc.setFontSize(14)
      doc.text(`${customerInfo.address} ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`, 105, 60, { align: "center" })
      //doc.text(`${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`, 105, 110, { align: "center" })

      doc.setTextColor(0,0,0)


      // Add cover image if available
      let imageBottomY = 65 // Default to just below the line if no image
      
      if (coverImage) {
        try {
          // Create a temporary image to get dimensions
          const tempImg = new Image()
          tempImg.src = coverImage
          
          // Wait for image to load to get dimensions
          await new Promise((resolve, reject) => {
            tempImg.onload = resolve
            tempImg.onerror = reject
            setTimeout(reject, 5000) // 5 second timeout
          })

          // Define the space boundaries
          const topBoundary = 70 // Just below the address line
          const bottomBoundary = 200 // Leave space for ATTN section
          const availableHeight = bottomBoundary - topBoundary // 130mm of vertical space
          
          // Calculate maximum dimensions
          const maxWidth = pageWidth * 0.85 // 85% of page width
          const maxHeight = availableHeight
          
          // Calculate the aspect ratio
          const aspectRatio = tempImg.width / tempImg.height
          
          // Calculate dimensions to fit within constraints while maintaining aspect ratio
          let imgWidth = maxWidth
          let imgHeight = imgWidth / aspectRatio
          
          // If height exceeds available space, scale down based on height instead
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight
            imgWidth = imgHeight * aspectRatio
          }
          
          // Center the image horizontally
          const imgX = (pageWidth - imgWidth) / 2
          
          // Center the image vertically within the available space
          const verticalPadding = (availableHeight - imgHeight) / 2
          const imgY = topBoundary + verticalPadding
          
          // Add the image
          doc.addImage(coverImage, "JPEG", imgX, imgY, imgWidth, imgHeight)
          
          // Update where the image ends
          imageBottomY = imgY + imgHeight
          
        } catch (error) {
          console.error("Error adding cover image to PDF:", error)
          // If there's an error, try adding the image without calculating dimensions
          try {
            const maxWidth = pageWidth * 0.85
            const imgX = (pageWidth - maxWidth) / 2
            const defaultHeight = maxWidth * 0.75
            const imgY = 70 + (130 - defaultHeight) / 2 // Center in available space
            doc.addImage(coverImage, "JPEG", imgX, imgY, maxWidth, defaultHeight)
            imageBottomY = imgY + defaultHeight
          } catch (fallbackError) {
            console.error("Fallback error adding cover image:", fallbackError)
          }
        }
      }

      // Position ATTN section with proper spacing below the image
      doc.setFontSize(14)
      const attnY = Math.max(imageBottomY + 20, 210) // At least 20mm below image, but not lower than 210
      
      doc.text("ATTN:", 105, attnY, { align: "center" })
      doc.setFontSize(13)
      doc.text(customerInfo.customerName, 105, attnY + 5, { align: "center" })
      doc.text(customerInfo.propertyName, 105, attnY + 10, { align: "center" })
      doc.text(`${customerInfo.address} ${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`, 105, attnY + 15 , { align: "center" })


      // Letter Page
      doc.addPage()
      addHeaderFooter(2, totalPages)

      doc.setFontSize(12)
      let yPos = contentStartY // Use the dynamic content start position instead of fixed 40

      doc.text(customerInfo.date, 15, yPos)
      yPos += 10
      doc.text(customerInfo.propertyName, 15, yPos)
      yPos += 7
      doc.text(customerInfo.customerName, 15, yPos)
      yPos += 7
      doc.text(`${rePrefix} ${customerInfo.address}`, 15, yPos)
      yPos += 7
      doc.text(`${customerInfo.city}, ${customerInfo.state} ${customerInfo.zip}`, 15, yPos)
      yPos += 20

      doc.text(`${dearPrefix} ${customerInfo.customerName.split(" ")[0]},`, 15, yPos)
      yPos += 10

      // Process letter text to replace placeholders
      const processedLetterText = letterText.map((text) => text.replace("{toiletCount}", toiletCount.toString()))

      processedLetterText.forEach((paragraph) => {
        const lines = doc.splitTextToSize(paragraph, 180)
        lines.forEach((line: string) => {
          doc.text(line, 15, yPos)
          yPos += 7
        })
        yPos += 5
      })

      // Add signature
      yPos += 5 // Reduced from 10
      doc.text("Very truly yours,", 15, yPos)
      yPos += 10 // Reduced from 20

      // Add signature image
      if (signatureImage) {
        doc.addImage(signatureImage, "PNG", 15, yPos, 40, 15) // Adjust width and height as needed
        yPos += 15 // Reduced from 20
      } else {
        yPos += 5 // Reduced from 10
      }

      doc.text(signatureName, 15, yPos)
      yPos += 7
      doc.text(signatureTitle, 15, yPos)

      // Notes Pages
      if (filteredNotes.length > 0) {
        let currentPage = 3
        let currentNoteIndex = 0

        while (currentNoteIndex < filteredNotes.length) {
          doc.addPage()
          addHeaderFooter(currentPage, totalPages)
          currentPage++

          doc.setFontSize(18)
          // Use section title from context
          doc.text(sectionTitles.notes || "Notes", 105, contentStartY, { align: "center" })

          doc.setFontSize(12)

          // Create table header - add more space after the title
          yPos = contentStartY + 10 // Add 10mm after the title
          doc.setFillColor(240, 240, 240)
          doc.rect(15, yPos - 5, 180, 10, "F")
          doc.setFont("helvetica", "bold")
          doc.setFontSize(10) // Set consistent font size for notes
          doc.text(latestColumnHeaders.unit, 20, yPos) // Use edited column header
          doc.text(latestColumnHeaders.notes, 50, yPos) // Use edited column header
          doc.setFont("helvetica", "normal")
          yPos += 10

          // Calculate the maximum Y position for content on this page
          const maxYPos = pageHeight - footerHeight - safeBottomMargin

          // Add as many notes as will fit on this page
          let rowCount = 0
          while (currentNoteIndex < filteredNotes.length) {
            const note = filteredNotes[currentNoteIndex]

            // Draw alternating row background
            if (rowCount % 2 === 0) {
              doc.setFillColor(250, 250, 250)
              doc.rect(15, yPos - 5, 180, 10, "F")
            }

            doc.text(note.unit, 20, yPos)

            // Handle long notes with wrapping
            const noteLines = doc.splitTextToSize(note.note, 140)
            doc.setFontSize(10) // Ensure consistent font size

            // Calculate the height this note will take
            const noteHeight = noteLines.length * 7 // 7mm per line

            // Check if this note will fit on the current page
            if (yPos + noteHeight > maxYPos && rowCount > 0) {
              // This note won't fit, so we'll start a new page
              break
            }

            // Add the note text
            noteLines.forEach((line: string, lineIndex: number) => {
              if (lineIndex === 0) {
                doc.text(line, 50, yPos)
              } else {
                yPos += 7
                doc.text(line, 50, yPos)
              }
            })

            yPos += 10
            currentNoteIndex++
            rowCount++

            // Check if we're near the bottom of the page
            if (yPos + 10 > maxYPos) {
              break
            }
          }
        }
      }

      // Detail Pages
      let currentPage = 3 + (filteredNotes.length > 0 ? Math.ceil(filteredNotes.length / estimatedNotesPerPage) : 0)

      // Debug the data to see what's in the aerator columns
      console.log(
        "PDF: First 5 items in installation data:",
        filteredData.slice(0, 5).map((item) => ({
          Unit: unitColumn ? item[unitColumn] : item.Unit,
          KitchenAerator: kitchenAeratorColumn ? item[kitchenAeratorColumn] : undefined,
          BathroomAerator: bathroomAeratorColumn ? item[bathroomAeratorColumn] : undefined,
          ShowerHead: showerHeadColumn ? item[showerHeadColumn] : undefined,
        })),
      )

      // Check if any unit has data in these columns
      const hasKitchenAeratorData =
        kitchenAeratorColumn &&
        filteredData.some((item) => item[kitchenAeratorColumn] && item[kitchenAeratorColumn] !== "")
      const hasBathroomAeratorData =
        bathroomAeratorColumn &&
        filteredData.some((item) => item[bathroomAeratorColumn] && item[bathroomAeratorColumn] !== "")
      const hasShowerData =
        showerHeadColumn && filteredData.some((item) => item[showerHeadColumn] && item[showerHeadColumn] !== "")

      // Determine which columns to show based on data
      const hasKitchenAerators = Boolean(hasKitchenAeratorData)
      const hasBathroomAerators = Boolean(hasBathroomAeratorData)
      const hasShowers = Boolean(hasShowerData)

      // Update the hasToilets check to look for any non-blank value in either column
      const hasToilets = filteredData.some((item) => hasToiletInstalled(item))

      // Check if any unit has notes
      const hasNotes = filteredData.some((item) => {
        let hasNote = false
        if (item["Leak Issue Kitchen Faucet"]) hasNote = true
        if (item["Leak Issue Bath Faucet"]) hasNote = true
        if (item["Tub Spout/Diverter Leak Issue"]) hasNote = true
        if (item.Notes) hasNote = true
        return hasNote
      })

      // Debug information
      console.log("PDF Column visibility:", {
        kitchenAeratorColumn,
        hasKitchenAeratorData,
        hasKitchenAerators,
        bathroomAeratorColumn,
        hasBathroomAeratorData,
        hasBathroomAerators,
        showerHeadColumn,
        hasShowerData,
        hasShowers,
        hasToilets,
        hasNotes,
      })

      // Calculate column positions based on which columns are shown
      const columnPositions = [17] // Unit column is always shown

      // Determine how many columns we're showing
      const visibleColumns = [hasKitchenAerators, hasBathroomAerators, hasShowers, hasToilets, hasNotes].filter(
        Boolean,
      ).length

      // Calculate width for each column
      const availableWidth = 180 // Total width
      const unitColumnWidth = 25 // Fixed width for unit column
      const remainingWidth = availableWidth - unitColumnWidth

      // Adjust column widths based on content
      const columnWidths = [unitColumnWidth]

      // Define minimum widths for each column type
      const minColumnWidths = {
        kitchen: 25,
        bathroom: 25,
        shower: 25,
        toilet: 20,
        notes: 60, // Increased width for notes column
      }

      // Calculate total minimum width needed
      let totalMinWidth = 0
      if (hasKitchenAerators) totalMinWidth += minColumnWidths.kitchen
      if (hasBathroomAerators) totalMinWidth += minColumnWidths.bathroom
      if (hasShowers) totalMinWidth += minColumnWidths.shower
      if (hasToilets) totalMinWidth += minColumnWidths.toilet
      if (hasNotes) totalMinWidth += minColumnWidths.notes

      // Adjust if minimum widths exceed available space
      const scaleFactor = totalMinWidth > remainingWidth ? remainingWidth / totalMinWidth : 1

      // Assign widths based on minimum requirements and available space
      if (hasKitchenAerators) columnWidths.push(Math.floor(minColumnWidths.kitchen * scaleFactor))
      if (hasBathroomAerators) columnWidths.push(Math.floor(minColumnWidths.bathroom * scaleFactor))
      if (hasShowers) columnWidths.push(Math.floor(minColumnWidths.shower * scaleFactor))
      if (hasToilets) columnWidths.push(Math.floor(minColumnWidths.toilet * scaleFactor))
      if (hasNotes) columnWidths.push(Math.floor(minColumnWidths.notes * scaleFactor))

      // Calculate positions based on widths
      let currentPos = 17
      columnPositions[0] = currentPos
      for (let i = 1; i < columnWidths.length; i++) {
        currentPos += columnWidths[i - 1]
        columnPositions.push(currentPos)
      }

      // Process installation data in batches that fit on each page
      let currentDataIndex = 0

      while (currentDataIndex < filteredData.length) {
        doc.addPage()
        addHeaderFooter(currentPage, totalPages)
        currentPage++

        doc.setFontSize(18)
        // Use section title from context
        doc.text(sectionTitles.detailsTitle || "Detailed Unit Information", 105, contentStartY, { align: "center" })

        // Create table header - add more space after the title
        yPos = contentStartY + 10 // Add 10mm after the title
        doc.setFillColor(240, 240, 240)
        doc.rect(15, yPos - 5, 180, 10, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8) // Smaller font for headers to fit better

        let colIndex = 0
        // Wrap and position unit header
        const unitHeaderLines = doc.splitTextToSize(latestColumnHeaders.unit, columnWidths[colIndex] - 2)
        unitHeaderLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
        })
        colIndex++

        // Wrap and position kitchen header
        if (hasKitchenAerators) {
          const kitchenHeaderLines = latestColumnHeaders.kitchen.split('\n')
          kitchenHeaderLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
          })
          colIndex++
        }
        if (hasBathroomAerators) {
          const bathroomHeaderLines = latestColumnHeaders.bathroom.split('\n')
          bathroomHeaderLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
          })
          colIndex++
        }
        if (hasShowers) {
          const showerHeaderLines = latestColumnHeaders.shower.split('\n')
          showerHeaderLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
          })
          colIndex++
        }
        if (hasToilets) {
          const toiletHeaderLines = latestColumnHeaders.toilet.split('\n')
          toiletHeaderLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
          })
          colIndex++
        }
        if (hasNotes) {
          const notesHeaderLines = doc.splitTextToSize(latestColumnHeaders.notes, columnWidths[colIndex] - 2)
          notesHeaderLines.forEach((line: string, lineIndex: number) => {
            doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
          })
          colIndex++
        }

        doc.setFont("helvetica", "normal")
        yPos += 10

        // Calculate the maximum Y position for content on this page
        const maxYPos = pageHeight - footerHeight - safeBottomMargin

        // Add as many rows as will fit on this page
        let rowCount = 0
        while (currentDataIndex < filteredData.length) {
          const item = filteredData[currentDataIndex]

          // Store the initial y position for this row
          const rowStartY = yPos - 5

          // Use the edited unit number if available, otherwise use the original
          const originalUnitValue = unitColumn ? item[unitColumn] : item.Unit
          const displayUnit =
            (originalUnitValue && latestEditedUnits[originalUnitValue] !== undefined)
              ? latestEditedUnits[originalUnitValue]
              : originalUnitValue || ""

          // Check if this is a special unit (shower room, office, etc.)
          const isSpecialUnit =
            (unitColumn && item[unitColumn] && item[unitColumn].toLowerCase().includes("shower")) ||
            (unitColumn && item[unitColumn] && item[unitColumn].toLowerCase().includes("office")) ||
            (unitColumn && item[unitColumn] && item[unitColumn].toLowerCase().includes("laundry"))

          // Get values for each cell using the found column names
          // Update the PDF generation to use edited installation values
          // In the section where you write data to PDF, update the kitchen, bathroom, shower, and toilet values

          // Replace the kitchenAerator calculation with:
          const kitchenAerator =
            isSpecialUnit || !kitchenAeratorColumn
              ? ""
              : (unitColumn && item[unitColumn] && latestEditedInstallations[item[unitColumn]]?.kitchen !== undefined)
                ? latestEditedInstallations[item[unitColumn]].kitchen
                : getAeratorDescription(item[kitchenAeratorColumn] || "", "kitchen")

          // Replace the bathroomAerator calculation with:
          const bathroomAerator = !bathroomAeratorColumn
            ? ""
            : (unitColumn && item[unitColumn] && latestEditedInstallations[item[unitColumn]]?.bathroom !== undefined)
              ? latestEditedInstallations[item[unitColumn]].bathroom
              : getAeratorDescription(item[bathroomAeratorColumn] || "", "bathroom")

          // Replace the showerHead calculation with:
          const showerHead = !showerHeadColumn
            ? ""
            : (unitColumn && item[unitColumn] && latestEditedInstallations[item[unitColumn]]?.shower !== undefined)
              ? latestEditedInstallations[item[unitColumn]].shower
              : getAeratorDescription(item[showerHeadColumn] || "", "shower")

          // Replace the toilet calculation with:
          const toilet =
            (unitColumn && item[unitColumn] && latestEditedInstallations[item[unitColumn]]?.toilet !== undefined)
              ? latestEditedInstallations[item[unitColumn]].toilet
              : hasToiletInstalled(item)
                ? "0.8 GPF"
                : ""

          // Update the notes compilation in the PDF generation
          // Compile notes with proper sentence case - only include leak issues
          let noteText = ""

          // Handle kitchen faucet leaks with severity
          if (item["Leak Issue Kitchen Faucet"]) {
            const leakValue = item["Leak Issue Kitchen Faucet"].trim()
            const lowerLeakValue = leakValue.toLowerCase()

            if (lowerLeakValue === "light") {
              noteText += "Light leak from kitchen faucet. "
            } else if (lowerLeakValue === "moderate") {
              noteText += "Moderate leak from kitchen faucet. "
            } else if (lowerLeakValue === "heavy") {
              noteText += "Heavy leak from kitchen faucet. "
            } else if (lowerLeakValue === "dripping" || lowerLeakValue === "driping") {
              noteText += "Dripping from kitchen faucet. "
            } else {
              // For any other non-empty value, show "leak from kitchen faucet"
              noteText += "Leak from kitchen faucet. "
            }
          }

          // Handle bathroom faucet leaks with severity
          if (item["Leak Issue Bath Faucet"]) {
            const leakValue = item["Leak Issue Bath Faucet"].trim()
            const lowerLeakValue = leakValue.toLowerCase()

            if (lowerLeakValue === "light") {
              noteText += "Light leak from bathroom faucet. "
            } else if (lowerLeakValue === "moderate") {
              noteText += "Moderate leak from bathroom faucet. "
            } else if (lowerLeakValue === "heavy") {
              noteText += "Heavy leak from bathroom faucet. "
            } else if (lowerLeakValue === "dripping" || lowerLeakValue === "driping") {
              noteText += "Dripping from bathroom faucet. "
            } else {
              // For any other non-empty value, show "leak from bathroom faucet"
              noteText += "Leak from bathroom faucet. "
            }
          }

          // Handle tub spout/diverter leaks with severity
          if (item["Tub Spout/Diverter Leak Issue"]) {
            const leakValue = item["Tub Spout/Diverter Leak Issue"]
            if (leakValue === "Light") {
              noteText += "Light leak from tub spout/diverter. "
            } else if (leakValue === "Moderate") {
              noteText += "Moderate leak from tub spout/diverter. "
            } else if (leakValue === "Heavy") {
              noteText += "Heavy leak from tub spout/diverter. "
            } else {
              // For any other value, just write "leak from tub spout/diverter"
              noteText += "Leak from tub spout/diverter. "
            }
          }

          // Check if all installation columns are blank
          const isUnitNotAccessed =
            (!kitchenAeratorColumn || item[kitchenAeratorColumn] === "" || item[kitchenAeratorColumn] === undefined) &&
            (!bathroomAeratorColumn ||
              item[bathroomAeratorColumn] === "" ||
              item[bathroomAeratorColumn] === undefined) &&
            (!showerHeadColumn || item[showerHeadColumn] === "" || item[showerHeadColumn] === undefined) &&
            !hasToiletInstalled(item)

          // If unit not accessed and no other notes, add that information
          if (isUnitNotAccessed && !noteText) {
            noteText = "Unit not accessed."
          }

          // Format the notes with proper sentence case
          noteText = formatNote(noteText)

          // Use unified notes system
          const unitValue = unitColumn ? item[unitColumn] : item.Unit
          const finalNoteText = getFinalNoteForUnit(unitValue || "", noteText)

          // Calculate how many lines the note will take
          let noteLines: string[] = []
          if (hasNotes && finalNoteText) {
            // Calculate the maximum width for notes based on the column width
            const maxWidth = columnWidths[columnWidths.length - 1] - 5
            noteLines = doc.splitTextToSize(finalNoteText, maxWidth)
          }

          // Calculate unit text lines for height calculation
          const unitLinesForHeight = doc.splitTextToSize(displayUnit, columnWidths[0] - 2)
          const unitHeight = Math.max(10, unitLinesForHeight.length * 3) // Height for unit text
          const rowHeight = Math.max(10, Math.max(unitHeight, noteLines.length * 5 + 5)) // Minimum 10mm, or more if needed for notes or unit text

          // Check if this row will fit on the current page
          if (yPos + rowHeight > maxYPos && rowCount > 0) {
            // This row won't fit, so we'll start a new page
            break
          }

          // Draw alternating row background
          if (rowCount % 2 === 0) {
            doc.setFillColor(250, 250, 250)
            doc.rect(15, rowStartY, 180, rowHeight, "F")
          }

          // Check if this row will fit on the current page
          if (yPos + rowHeight > maxYPos && rowCount > 0) {
            // This row won't fit, so we'll start a new page
            break
          }

          // Draw alternating row background
          if (rowCount % 2 === 0) {
            doc.setFillColor(250, 250, 250)
            doc.rect(15, rowStartY, 180, rowHeight, "F")
          }

          // Write data to PDF
          doc.setFontSize(9)

          colIndex = 0
          
          // Wrap unit text if it's too long
          unitLinesForHeight.forEach((line: string, lineIndex: number) => {
            doc.text(line, columnPositions[colIndex], yPos + (lineIndex * 3))
          })
          colIndex++

          if (hasKitchenAerators) {
            const kitchenText = kitchenAerator === "No Touch." ? "—" : kitchenAerator
            // Center the dash, left-align other text
            if (kitchenText === "—") {
              // Simple dash
              doc.text("\t—\t", columnPositions[colIndex], yPos)
            } else {
              doc.text(kitchenText, columnPositions[colIndex], yPos)
            }
            colIndex++
          }
          if (hasBathroomAerators) {
            const bathroomText = bathroomAerator === "No Touch." ? "—" : bathroomAerator
            if (bathroomText === "—") {
              doc.text("\t—\t", columnPositions[colIndex], yPos)
            } else {
              doc.text(bathroomText, columnPositions[colIndex], yPos)
            }
            colIndex++
          }
          if (hasShowers) {
            const showerText = showerHead === "No Touch." ? "—" : showerHead
            if (showerText === "—") {
              doc.text("\t—\t", columnPositions[colIndex], yPos)
            } else {
              doc.text(showerText, columnPositions[colIndex], yPos)
            }
            colIndex++
          }
          if (hasToilets) {
            const toiletText = toilet ? toilet : "—"
            if (toiletText === "—") {
              doc.text("\t—\t", columnPositions[colIndex], yPos)
            } else {
              doc.text(toiletText, columnPositions[colIndex], yPos)
            }
            colIndex++
          }

          // Handle notes with wrapping if needed
          if (hasNotes) {
            doc.setFontSize(10) // Ensure consistent font size for notes
            // Write each line, incrementing the y-position for each additional line
            noteLines.forEach((line, lineIndex) => {
              if (lineIndex === 0) {
                doc.text(line, columnPositions[colIndex], yPos)
              } else {
                yPos += 5
                doc.text(line, columnPositions[colIndex], yPos)
              }
            })
          }

          // Increment y position based on the row height
          yPos = rowStartY + rowHeight + 5
          currentDataIndex++
          rowCount++

          // Check if we're near the bottom of the page
          if (yPos + 10 > maxYPos) {
            break
          }
        }
      }

      // Update the total pages count based on the actual number of pages generated
      totalPages = currentPage - 1

      // Save the PDF
      const filename = `${customerInfo.propertyName.replace(/\s+/g, "-")}_Water_Conservation_Report.pdf`
      console.log("Saving enhanced PDF as:", filename)
      doc.save(filename)

      console.log("Enhanced PDF generation complete!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert(`There was an error generating the PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const allLoaded = jsPDFLoaded && logoLoaded && footerLoaded && signatureLoaded

  return (
    <Button onClick={handleGeneratePdf} disabled={isGenerating || !allLoaded}>
      <FileDown className="mr-2 h-4 w-4" />
      {isGenerating
        ? "Generating PDF..."
        : allLoaded
          ? "Download Complete PDF"
          : `Loading PDF Generator (${[
              jsPDFLoaded ? "✓" : "✗",
              logoLoaded ? "✓" : "✗",
              footerLoaded ? "✓" : "✗",
              signatureLoaded ? "✓" : "✗",
            ].join(" ")})`}
    </Button>
  )
}
