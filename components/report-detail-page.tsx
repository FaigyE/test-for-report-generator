"use client"
import { useState, useEffect } from "react"
import EditableText from "@/components/editable-text"
import { getAeratorDescription, formatNote } from "@/lib/utils/aerator-helpers"
import { useReportContext } from "@/lib/report-context"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { getFinalNoteForUnit, updateStoredNote, getStoredNotes } from "@/lib/notes"

interface InstallationData {
  Unit: string
  "Shower Head"?: string
  "Bathroom aerator"?: string
  "Kitchen Aerator"?: string
  "Leak Issue Kitchen Faucet"?: string
  "Leak Issue Bath Faucet"?: string
  "Tub Spout/Diverter Leak Issue"?: string
  Notes?: string
  [key: string]: string | undefined
}

interface ReportDetailPageProps {
  installationData: InstallationData[]
  isPreview?: boolean
  isEditable?: boolean
}

export default function ReportDetailPage({
  installationData,
  isPreview = true,
  isEditable = true,
}: ReportDetailPageProps) {
  const { sectionTitles, setSectionTitles } = useReportContext()

  // State to store edited notes
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({})
  const [editedInstallations, setEditedInstallations] = useState<Record<string, Record<string, string>>>({})
  const [editedUnits, setEditedUnits] = useState<Record<string, string>>({})
  const [additionalRows, setAdditionalRows] = useState<InstallationData[]>([])
  const [columnHeaders, setColumnHeaders] = useState({
    unit: "Unit",
    kitchen: "Kitchen Installed",
    bathroom: "Bathroom Installed",
    shower: "Shower Installed",
    toilet: "Toilet Installed",
    notes: "Notes",
  })

  const findUnitColumn = (data: InstallationData[]): string | null => {
    if (!data || data.length === 0) return null

    const item = data[0]
    console.log("All column names for unit detection:", Object.keys(item))

    for (const key of Object.keys(item)) {
      if (key.toLowerCase().includes("unit")) {
        return key
      }
    }

    const unitKeywords = ["unit", "apt", "apartment", "room", "number"]
    for (const key of Object.keys(item)) {
      const keyLower = key.toLowerCase()
      for (const keyword of unitKeywords) {
        if (keyLower.includes(keyword)) {
          console.log(`Found column containing ${keyword}: ${key}`)
          return key
        }
      }
    }

    const firstKey = Object.keys(item)[0]
    console.log(`No unit column found, using first column as fallback: ${firstKey}`)
    return firstKey
  }

  const unitColumn = findUnitColumn(installationData)

  // Function to get the appropriate "not accessed" message based on unit column name
  const getNotAccessedMessage = (): string => {
    if (!unitColumn) return "Unit not accessed."

    const columnLower = unitColumn.toLowerCase()
    if (columnLower.includes("apt") || columnLower.includes("apartment")) {
      return "Apt not accessed."
    }
    return "Unit not accessed."
  }

  // Combine and sort all data
  const allData = [...additionalRows, ...installationData]

  // Function to sort data by unit number
  const sortDataByUnit = (data: InstallationData[]) => {
    return [...data].sort((a, b) => {
      const unitA = unitColumn ? a[unitColumn] : a.Unit
      const unitB = unitColumn ? b[unitColumn] : b.Unit

      // Get edited unit numbers if they exist
      const finalUnitA =
        unitA !== undefined && editedUnits[unitA] !== undefined ? editedUnits[unitA] : unitA
      const finalUnitB =
        unitB !== undefined && editedUnits[unitB] !== undefined ? editedUnits[unitB] : unitB

      // Handle empty units - put them at the top
      if (!finalUnitA || finalUnitA.trim() === "") return -1
      if (!finalUnitB || finalUnitB.trim() === "") return 1

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
  }

  // Updated findColumnName function to better detect columns with actual data
  const findColumnName = (possibleNames: string[]): string | null => {
    if (!installationData || installationData.length === 0) return null

    console.log("Detail: Looking for columns:", possibleNames)
    console.log("Detail: Available columns:", Object.keys(installationData[0]))

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
          `Detail: Found matching column "${key}" with ${dataCount} meaningful data entries. Sample values:`,
          sampleValues,
        )
      }
    }

    if (matchingColumns.length === 0) {
      console.log("Detail: No matching columns found")
      return null
    }

    // Sort by data count (descending) to prioritize columns with more meaningful data
    matchingColumns.sort((a, b) => b.dataCount - a.dataCount)

    const selectedColumn = matchingColumns[0].key
    console.log(
      `Detail: Selected column "${selectedColumn}" with ${matchingColumns[0].dataCount} meaningful data entries`,
    )
    console.log(`Detail: Sample values from selected column:`, matchingColumns[0].sampleValues)

    return selectedColumn
  }

  // Function to find all shower-related columns
  const findAllShowerColumns = (): string[] => {
    if (!installationData || installationData.length === 0) return []

    const showerColumns: string[] = []
    const showerKeywords = ["shower", "shwr"]

    for (const key of Object.keys(installationData[0])) {
      const keyLower = key.toLowerCase()

      // Check if this column contains shower-related keywords
      if (showerKeywords.some((keyword) => keyLower.includes(keyword))) {
        // Also check if it has meaningful data
        const meaningfulDataCount = installationData.filter((item) => {
          const value = item[key]
          if (!value) return false
          const trimmed = String(value).trim().toLowerCase()
          return (
            trimmed !== "" &&
            trimmed !== "0" &&
            trimmed !== "no" &&
            trimmed !== "n/a" &&
            trimmed !== "na" &&
            trimmed !== "none"
          )
        }).length

        if (meaningfulDataCount > 0) {
          showerColumns.push(key)
          console.log(`Detail: Found shower column "${key}" with ${meaningfulDataCount} data entries`)
        }
      }
    }

    console.log("Detail: All shower columns found:", showerColumns)
    return showerColumns
  }

  // Function to get shower value from any shower column for a specific item
  const getShowerValue = (item: InstallationData): string => {
    const showerColumns = findAllShowerColumns()

    for (const column of showerColumns) {
      const value = item[column]
      if (value && String(value).trim() !== "" && String(value).trim() !== "0") {
        console.log(
          `Detail: Found shower value "${value}" in column "${column}" for unit ${unitColumn ? item[unitColumn] : item.Unit}`,
        )
        return getAeratorDescription(value, "shower")
      }
    }

    return "No Touch."
  }

  const kitchenAeratorColumn = findColumnName(["Kitchen Aerator", "kitchen aerator", "kitchen", "kitchen aerators"])
  const bathroomAeratorColumn = findColumnName([
    "Bathroom aerator",
    "bathroom aerator",
    "bathroom",
    "bathroom aerators",
    "bath aerator",
  ])
  const showerHeadColumn = findColumnName(["Shower Head", "shower head", "shower", "shower heads"])

  console.log("Detail: Final column selections:", {
    kitchenAeratorColumn,
    bathroomAeratorColumn,
    showerHeadColumn,
  })

  // Helper functions - moved before they're used
  const getToiletColumnInfo = (item: InstallationData): { installed: boolean; columnName: string | null } => {
    const toiletColumn = Object.keys(item).find((key) => key.startsWith("Toilets Installed:"))
    if (toiletColumn && item[toiletColumn] && item[toiletColumn] !== "") {
      return { installed: true, columnName: toiletColumn }
    }
    return { installed: false, columnName: null }
  }

  const hasToiletInstalled = (item: InstallationData): boolean => {
    return getToiletColumnInfo(item).installed
  }

  // Function to compile notes for a unit (used by both details and notes sections)
  const compileNotesForUnit = (item: InstallationData, includeNotAccessed = true): string => {
    // Compile notes from leak issues only
    let notes = ""

    // Handle kitchen faucet leaks with severity
    if (item["Leak Issue Kitchen Faucet"]) {
      const leakValue = item["Leak Issue Kitchen Faucet"].trim()
      const lowerLeakValue = leakValue.toLowerCase()
      if (lowerLeakValue === "light") {
        notes += "Light leak from kitchen faucet. "
      } else if (lowerLeakValue === "moderate") {
        notes += "Moderate leak from kitchen faucet. "
      } else if (lowerLeakValue === "heavy") {
        notes += "Heavy leak from kitchen faucet. "
      } else if (lowerLeakValue === "dripping" || lowerLeakValue === "driping") {
        notes += "Dripping from kitchen faucet. "
      } else {
        notes += "Leak from kitchen faucet. "
      }
    }

    // Handle bathroom faucet leaks with severity
    if (item["Leak Issue Bath Faucet"]) {
      const leakValue = item["Leak Issue Bath Faucet"].trim()
      const lowerLeakValue = leakValue.toLowerCase()
      if (lowerLeakValue === "light") {
        notes += "Light leak from bathroom faucet. "
      } else if (lowerLeakValue === "moderate") {
        notes += "Moderate leak from bathroom faucet. "
      } else if (lowerLeakValue === "heavy") {
        notes += "Heavy leak from bathroom faucet. "
      } else if (lowerLeakValue === "dripping" || lowerLeakValue === "driping") {
        notes += "Dripping from bathroom faucet. "
      } else {
        notes += "Leak from bathroom faucet. "
      }
    }

    // Handle tub spout/diverter leaks with severity
    if (item["Tub Spout/Diverter Leak Issue"]) {
      const leakValue = item["Tub Spout/Diverter Leak Issue"]
      if (leakValue === "Light") {
        notes += "Light leak from tub spout/diverter. "
      } else if (leakValue === "Moderate") {
        notes += "Moderate leak from tub spout/diverter. "
      } else if (leakValue === "Heavy") {
        notes += "Heavy leak from tub spout/diverter. "
      } else {
        notes += "Leak from tub spout/diverter. "
      }
    }

    // --- Add selected cells and selected notes columns to notes ---
    let selectedCells: Record<string, string[]> = {}
    let selectedNotesColumns: string[] = []
    try {
      if (typeof window !== 'undefined') {
        const storedSelectedCells = localStorage.getItem("selectedCells")
        const storedSelectedNotesColumns = localStorage.getItem("selectedNotesColumns")
        if (storedSelectedCells) selectedCells = JSON.parse(storedSelectedCells)
        if (storedSelectedNotesColumns) selectedNotesColumns = JSON.parse(storedSelectedNotesColumns)
      }
    } catch {}
    // Add notes from selected columns
    if (selectedNotesColumns && selectedNotesColumns.length > 0) {
      selectedNotesColumns.forEach((col) => {
        const val = item[col]
        if (val && val.trim() !== "") {
          notes += `${val}. `
        }
      })
    }
    // Add notes from selected cells
    const unitValue = unitColumn ? item[unitColumn] : item.Unit
    if (unitValue && selectedCells[unitValue]) {
      selectedCells[unitValue].forEach((cellInfo) => {
        notes += `${cellInfo}. `
      })
    }

    // Check if unit was not accessed (all installation columns are empty)
    const kitchenAerator = kitchenAeratorColumn ? getAeratorDescription(item[kitchenAeratorColumn] ?? "", "kitchen") : ""
    const bathroomAerator = bathroomAeratorColumn ? getAeratorDescription(item[bathroomAeratorColumn] ?? "", "bathroom") : ""
    const shower = getShowerValue(item)
    const toilet = hasToiletInstalled(item) ? "0.8 GPF" : ""

    const isUnitNotAccessed =
      (!kitchenAerator || kitchenAerator === "No Touch.") &&
      (!bathroomAerator || bathroomAerator === "No Touch.") &&
      (!shower || shower === "No Touch.") &&
      !toilet

    if (isUnitNotAccessed && !notes.trim() && includeNotAccessed) {
      notes = getNotAccessedMessage()
    }

    return formatNote(notes.trim())
  }

  // Filter and sort data
  const filteredData = (() => {
    const result = []

    console.log("Detail page: Starting to process installation data...")
    console.log("Detail page: Total rows to process:", allData.length)

    for (let i = 0; i < allData.length; i++) {
      const item = allData[i]
      const isAdditionalRow = i < additionalRows.length

      // Get the unit value using the detected unit column
      const unitValue = unitColumn ? item[unitColumn] : item.Unit

      console.log(
        `Detail page Row ${i + 1}: Unit="${unitValue}" (type: ${typeof unitValue}, isAdditional: ${isAdditionalRow})`,
      )

      // For additional rows, include them even if unit is empty (they can be edited)
      if (isAdditionalRow) {
        console.log(`Detail page: Adding additional row ${i + 1}`)
        result.push(item)
        continue
      }

      // For original data, stop at first empty unit
      if (
        unitValue === undefined ||
        unitValue === null ||
        unitValue === "" ||
        (typeof unitValue === "string" && unitValue.trim() === "")
      ) {
        console.log(`Detail page STOPPING: Found empty unit at row ${i + 1}. Processed ${result.length} valid rows.`)
        break // Stop processing immediately when we find an empty unit
      }

      // Convert to string and trim for further checks (original data only)
      const trimmedUnit = String(unitValue).trim()

      if (trimmedUnit === "") {
        console.log(`Detail page STOPPING: Found empty unit after trimming at row ${i + 1}`)
        break
      }

      // Check if this unit has been marked for deletion
      if (editedUnits[trimmedUnit] === "") {
        console.log(`Detail page: Skipping deleted unit "${trimmedUnit}"`)
        continue
      }

      // Filter out invalid values for original data - but be more specific
      const lowerUnit = trimmedUnit.toLowerCase()
      const invalidValues = ["total", "sum", "average", "avg", "count", "header", "grand total", "subtotal"]

      // Check if the entire unit value matches invalid patterns
      const isInvalidUnit = invalidValues.some((val) => lowerUnit === val || lowerUnit.includes(val))

      // Also check if this looks like a summary row by examining other columns
      const hasInstallationData =
        (kitchenAeratorColumn && item[kitchenAeratorColumn] && item[kitchenAeratorColumn] !== "") ||
        (bathroomAeratorColumn && item[bathroomAeratorColumn] && item[bathroomAeratorColumn] !== "") ||
        getShowerValue(item) !== "No Touch." || // Use the new function
        hasToiletInstalled(item)

      const hasLeakData =
        item["Leak Issue Kitchen Faucet"] || item["Leak Issue Bath Faucet"] || item["Tub Spout/Diverter Leak Issue"]

      // Only skip if it's clearly an invalid unit AND has no relevant data
      if (isInvalidUnit && !hasInstallationData && !hasLeakData) {
        console.log(`Detail page: Skipping invalid unit "${trimmedUnit}" (no installation or leak data)`)
        continue
      }

      console.log(`Detail page: Adding valid unit: "${trimmedUnit}"`)
      result.push(item)
    }

    console.log(`Detail page: Final result before sorting: ${result.length} valid units processed`)

    // Sort the final result
    const sortedResult = sortDataByUnit(result)
    console.log(`Detail page: Final result after sorting: ${sortedResult.length} valid units`)

    return sortedResult
  })()

  console.log("Filtered data length:", filteredData.length)

  // Split data into pages
  const itemsPerPage = 10
  const dataPages = []
  for (let i = 0; i < filteredData.length; i += itemsPerPage) {
    dataPages.push(filteredData.slice(i, i + itemsPerPage))
  }

  // Check what columns to show - updated logic
  const hasKitchenAeratorData =
    kitchenAeratorColumn &&
    filteredData.some((item) => {
      const value = item[kitchenAeratorColumn]
      return value !== undefined && value !== null && value !== "" && value.trim() !== ""
    })

  const hasBathroomAeratorData =
    bathroomAeratorColumn &&
    filteredData.some((item) => {
      const value = item[bathroomAeratorColumn]
      return value !== undefined && value !== null && value !== "" && value.trim() !== ""
    })

  // Updated shower data check to use the new function
  const hasShowerData = filteredData.some((item) => {
    const showerValue = getShowerValue(item)
    return showerValue !== "No Touch."
  })

  const hasKitchenAerators = Boolean(hasKitchenAeratorData) || additionalRows.length > 0
  const hasBathroomAerators = Boolean(hasBathroomAeratorData) || additionalRows.length > 0
  const hasShowers = Boolean(hasShowerData) || additionalRows.length > 0
  const hasToilets = filteredData.some((item) => hasToiletInstalled(item)) || additionalRows.length > 0
  const hasNotes = true // Always show notes column

  console.log("Detail: Column visibility:", {
    hasKitchenAeratorData,
    hasKitchenAerators,
    hasBathroomAeratorData,
    hasBathroomAerators,
    hasShowerData,
    hasShowers,
    hasToilets,
    hasNotes,
  })

  // Event handlers
  const handleNoteEdit = (unit: string, value: string) => {
    if (isEditable) {
      // Use unified notes system
      updateStoredNote(unit, value)
      
      // Also update local state for immediate UI update
      setEditedNotes((prev) => {
        const updated = { ...prev, [unit]: value }
        return updated
      })
    }
  }

  const handleInstallationEdit = (unit: string, column: string, value: string) => {
    if (isEditable) {
      const isAdditionalRow = additionalRows.some((row) => {
        const rowUnit = unitColumn ? row[unitColumn] : row.Unit
        return rowUnit === unit
      })

      if (isAdditionalRow) {
        const updatedRows = additionalRows.map((row) => {
          const rowUnit = unitColumn ? row[unitColumn] : row.Unit
          if (rowUnit === unit) {
            const updatedRow = { ...row }
            if (column === "kitchen") {
              updatedRow["Kitchen Aerator"] = value
            } else if (column === "bathroom") {
              updatedRow["Bathroom aerator"] = value
            } else if (column === "shower") {
              updatedRow["Shower Head"] = value
            } else if (column === "toilet") {
              const toiletColumn = Object.keys(row).find((key) => key.startsWith("Toilets Installed:"))
              if (toiletColumn) {
                updatedRow[toiletColumn] = value ? "1" : ""
              }
            }
            return updatedRow
          }
          return row
        })
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
      } else {
        setEditedInstallations((prev) => {
          const unitData = prev[unit] || {}
          const updated = {
            ...prev,
            [unit]: {
              ...unitData,
              [column]: value,
            },
          }
          localStorage.setItem("detailInstallations", JSON.stringify(updated))
          return updated
        })
      }
    }
  }

  const handleUnitEdit = (originalUnit: string, newUnit: string) => {
    if (isEditable) {
      const isAdditionalRow = additionalRows.some((row) => {
        const rowUnit = unitColumn ? row[unitColumn] : row.Unit
        return rowUnit === originalUnit
      })

      if (isAdditionalRow) {
        const updatedRows = additionalRows.map((row) => {
          const rowUnit = unitColumn ? row[unitColumn] : row.Unit
          if (rowUnit === originalUnit) {
            const updatedRow = { ...row }
            if (unitColumn) {
              updatedRow[unitColumn] = newUnit
            }
            updatedRow.Unit = newUnit
            return updatedRow
          }
          return row
        })
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))

        // If this is a new unit being added and it has a note, ensure the note appears in the notes section
        if (newUnit && newUnit.trim() !== "" && originalUnit === "") {
          const storedNotes = getStoredNotes()
          if (storedNotes[newUnit]) {
            console.log("Unit added to details has a note, ensuring it appears in notes section:", newUnit)
            // The notes section will automatically pick this up through the unified notes system
            // Dispatch the event to notify the notes section
            window.dispatchEvent(new Event("unifiedNotesUpdated"))
          }
        }
      } else {
        if (newUnit === "") {
          setEditedUnits((prev) => {
            const updated = { ...prev, [originalUnit]: "" }
            localStorage.setItem("editedUnits", JSON.stringify(updated))
            return updated
          })
        } else {
          setEditedUnits((prev) => {
            const updated = { ...prev, [originalUnit]: newUnit }
            localStorage.setItem("editedUnits", JSON.stringify(updated))
            return updated
          })

          // If this is a new unit being added and it has a note, ensure the note appears in the notes section
          if (newUnit && newUnit.trim() !== "" && originalUnit === "") {
            const storedNotes = getStoredNotes()
            if (storedNotes[newUnit]) {
              console.log("Unit added to details has a note, ensuring it appears in notes section:", newUnit)
              // The notes section will automatically pick this up through the unified notes system
              // Dispatch the event to notify the notes section
              window.dispatchEvent(new Event("unifiedNotesUpdated"))
            }
          }
        }
      }
    }
  }

  const handleAddRow = () => {
    if (isEditable) {
      console.log("Add Row clicked!")

      const newRow: InstallationData = {
        Unit: "", // Start with blank unit
      }

      // Add the unit column if it exists and is different from "Unit"
      if (unitColumn && unitColumn !== "Unit") {
        newRow[unitColumn] = ""
      }

      // Add all standard columns
      newRow["Shower Head"] = ""
      newRow["Bathroom aerator"] = ""
      newRow["Kitchen Aerator"] = ""
      newRow["Leak Issue Kitchen Faucet"] = ""
      newRow["Leak Issue Bath Faucet"] = ""
      newRow["Tub Spout/Diverter Leak Issue"] = ""
      newRow["Notes"] = ""

      console.log("Creating new row:", newRow)

      const updatedRows = [newRow, ...additionalRows] // Add to beginning
      console.log("Updated additional rows:", updatedRows)

      setAdditionalRows(updatedRows)
      localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))

      console.log("New row added successfully!")
    }
  }

  const handleDeleteRow = (item: InstallationData) => {
    if (isEditable) {
      const unitValue = unitColumn ? item[unitColumn] : item.Unit
      const isAdditionalRow = additionalRows.some((row) => (unitColumn ? row[unitColumn] : row.Unit) === unitValue)

      if (isAdditionalRow) {
        const updatedRows = additionalRows.filter((row) => (unitColumn ? row[unitColumn] : row.Unit) !== unitValue)
        setAdditionalRows(updatedRows)
        localStorage.setItem("additionalDetailRows", JSON.stringify(updatedRows))
        
        // Also remove the note from the unified notes system if it exists
        if (unitValue) {
          const storedNotes = getStoredNotes()
          if (storedNotes[unitValue]) {
            const updatedStoredNotes = { ...storedNotes }
            delete updatedStoredNotes[unitValue]
            localStorage.setItem("unifiedNotes", JSON.stringify(updatedStoredNotes))
            console.log("Removed note for deleted unit:", unitValue)
            // Dispatch event to notify notes section
            window.dispatchEvent(new Event("unifiedNotesUpdated"))
          }
        }
      } else {
        handleUnitEdit(unitValue ?? "", "")
        
        // Also remove the note from the unified notes system if it exists
        if (unitValue) {
          const storedNotes = getStoredNotes()
          if (storedNotes[unitValue]) {
            const updatedStoredNotes = { ...storedNotes }
            delete updatedStoredNotes[unitValue]
            localStorage.setItem("unifiedNotes", JSON.stringify(updatedStoredNotes))
            console.log("Removed note for deleted unit:", unitValue)
            // Dispatch event to notify notes section
            window.dispatchEvent(new Event("unifiedNotesUpdated"))
          }
        }
      }
    }
  }

  const handleSectionTitleChange = (value: string) => {
    if (isEditable) {
      setSectionTitles((prev) => {
        const updated = { ...prev, detailsTitle: value }
        localStorage.setItem("sectionTitles", JSON.stringify(updated))
        return updated
      })
    }
  }

  const handleColumnHeaderChange = (column: string, value: string) => {
    if (isEditable) {
      setColumnHeaders((prev) => {
        const updated = { ...prev, [column]: value }
        localStorage.setItem("columnHeaders", JSON.stringify(updated))
        return updated
      })
    }
  }

  // Load data from localStorage
  useEffect(() => {
    const storedInstallations = localStorage.getItem("detailInstallations")
    if (storedInstallations) {
      try {
        setEditedInstallations(JSON.parse(storedInstallations))
      } catch (error) {
        console.error("Error parsing stored installations:", error)
      }
    }

    const storedHeaders = localStorage.getItem("columnHeaders")
    if (storedHeaders) {
      try {
        setColumnHeaders(JSON.parse(storedHeaders))
      } catch (error) {
        console.error("Error parsing stored headers:", error)
      }
    }

    const storedUnits = localStorage.getItem("editedUnits")
    if (storedUnits) {
      try {
        setEditedUnits(JSON.parse(storedUnits))
      } catch (error) {
        console.error("Error parsing stored units:", error)
      }
    }

    const storedRows = localStorage.getItem("additionalDetailRows")
    if (storedRows) {
      try {
        const parsedRows = JSON.parse(storedRows)
        console.log("Loaded additional detail rows from localStorage:", parsedRows)
        setAdditionalRows(parsedRows)
      } catch (error) {
        console.error("Error parsing stored additional rows:", error)
      }
    }
  }, [])

  // Listen for unified notes updates
  useEffect(() => {
    const handleNotesUpdate = () => {
      console.log("Details: Received unified notes update event")
      // Force re-render by updating editedNotes state
      setEditedNotes((prev) => ({ ...prev }))
    }

    window.addEventListener("unifiedNotesUpdated", handleNotesUpdate)
    return () => window.removeEventListener("unifiedNotesUpdated", handleNotesUpdate)
  }, [])

  const detailsTitle = sectionTitles.detailsTitle || "Detailed Unit Information"

  return isPreview ? (
    <div className="report-page min-h-[1056px] relative">
      <div className="mb-8">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
          alt="GreenLight Logo"
          className="h-24"
          crossOrigin="anonymous"
        />
      </div>

      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isEditable ? (
              <EditableText
                value={detailsTitle}
                onChange={handleSectionTitleChange}
                placeholder="Section Title"
                className="text-xl font-bold"
              />
            ) : (
              detailsTitle
            )}
          </h2>
          {isEditable && (
            <Button onClick={handleAddRow} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 border-b">
                {isEditable ? (
                  <EditableText
                    value={columnHeaders.unit}
                    onChange={(value) => handleColumnHeaderChange("unit", value)}
                    placeholder="Unit"
                  />
                ) : (
                  columnHeaders.unit
                )}
              </th>
              {hasKitchenAerators && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.kitchen}
                      onChange={(value) => handleColumnHeaderChange("kitchen", value)}
                      placeholder="Kitchen"
                    />
                  ) : (
                    columnHeaders.kitchen
                  )}
                </th>
              )}
              {hasBathroomAerators && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.bathroom}
                      onChange={(value) => handleColumnHeaderChange("bathroom", value)}
                      placeholder="Bathroom"
                    />
                  ) : (
                    columnHeaders.bathroom
                  )}
                </th>
              )}
              {hasShowers && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.shower}
                      onChange={(value) => handleColumnHeaderChange("shower", value)}
                      placeholder="Shower"
                    />
                  ) : (
                    columnHeaders.shower
                  )}
                </th>
              )}
              {hasToilets && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.toilet}
                      onChange={(value) => handleColumnHeaderChange("toilet", value)}
                      placeholder="Toilet"
                    />
                  ) : (
                    columnHeaders.toilet
                  )}
                </th>
              )}
              {hasNotes && (
                <th className="text-left py-2 px-2 border-b">
                  {isEditable ? (
                    <EditableText
                      value={columnHeaders.notes}
                      onChange={(value) => handleColumnHeaderChange("notes", value)}
                      placeholder="Notes"
                    />
                  ) : (
                    columnHeaders.notes
                  )}
                </th>
              )}
              {isEditable && <th className="text-left py-2 px-2 border-b w-16">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => {
              const unitValue = unitColumn ? item[unitColumn] : item.Unit
              const isAdditionalRow = additionalRows.some(
                (row) => (unitColumn ? row[unitColumn] : row.Unit) === unitValue,
              )

              // Get values for display
              const kitchenAerator = kitchenAeratorColumn
                ? getAeratorDescription(item[kitchenAeratorColumn] ?? "", "kitchen")
                : ""
              const bathroomAerator = bathroomAeratorColumn
                ? getAeratorDescription(item[bathroomAeratorColumn] ?? "", "bathroom")
                : ""
              const shower = getShowerValue(item) // Use the new function
              const toilet = hasToiletInstalled(item) ? "0.8 GPF" : ""

              // Get compiled notes (including "not accessed" for details section)
              const compiledNotes = compileNotesForUnit(item, true)
                  const finalNote = getFinalNoteForUnit(unitValue ?? "", compiledNotes)

              return (
                <tr key={index}>
                  <td className="py-2 px-2 border-b">
                    {isEditable ? (
                      <EditableText
                        value={editedUnits[unitValue ?? ""] !== undefined ? editedUnits[unitValue ?? ""] : unitValue ?? ""}
                        onChange={(value) => handleUnitEdit(unitValue ?? "", value)}
                        placeholder="Unit number"
                      />
                    ) : editedUnits[unitValue ?? ""] !== undefined ? (
                      editedUnits[unitValue ?? ""]
                    ) : (
                      unitValue ?? ""
                    )}
                  </td>
                  {hasKitchenAerators && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            unitValue !== undefined && editedInstallations[unitValue]?.kitchen !== undefined
                              ? editedInstallations[unitValue]!.kitchen
                              : kitchenAerator === "No Touch."
                                ? ""
                                : kitchenAerator
                          }
                          onChange={(value) => handleInstallationEdit(unitValue ?? "", "kitchen", value)}
                          placeholder="Kitchen"
                          className="text-center"
                        />
                      ) : kitchenAerator === "No Touch." ? (
                        "—"
                      ) : (
                        kitchenAerator
                      )}
                    </td>
                  )}
                  {hasBathroomAerators && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            unitValue !== undefined && editedInstallations[unitValue]?.bathroom !== undefined
                              ? editedInstallations[unitValue]!.bathroom
                              : bathroomAerator === "No Touch."
                                ? ""
                                : bathroomAerator
                          }
                          onChange={(value) => handleInstallationEdit(unitValue ?? "", "bathroom", value)}
                          placeholder="Bathroom"
                          className="text-center"
                        />
                      ) : bathroomAerator === "No Touch." ? (
                        "—"
                      ) : (
                        bathroomAerator
                      )}
                    </td>
                  )}
                  {hasShowers && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            unitValue !== undefined && editedInstallations[unitValue]?.shower !== undefined
                              ? editedInstallations[unitValue]!.shower
                              : shower === "No Touch."
                                ? ""
                                : shower
                          }
                          onChange={(value) => handleInstallationEdit(unitValue ?? "", "shower", value)}
                          placeholder="Shower"
                          className="text-center"
                        />
                      ) : shower === "No Touch." ? (
                        "—"
                      ) : (
                        shower
                      )}
                    </td>
                  )}
                  {hasToilets && (
                    <td className="py-2 px-2 border-b text-center">
                      {isEditable ? (
                        <EditableText
                          value={
                            editedInstallations[unitValue ?? ""]?.toilet !== undefined
                              ? editedInstallations[unitValue ?? ""].toilet
                              : toilet || ""
                          }
                          onChange={(value) => handleInstallationEdit(unitValue ?? "", "toilet", value)}
                          placeholder="Toilet"
                          className="text-center"
                        />
                      ) : (
                        toilet || "—"
                      )}
                    </td>
                  )}
                  {hasNotes && (
                    <td className="py-2 px-2 border-b">
                      {isEditable ? (
                        <EditableText
                          value={finalNote}
                          onChange={(value) => handleNoteEdit(unitValue ?? "", value)}
                          placeholder="Notes"
                          multiline={true}
                        />
                      ) : (
                        finalNote
                      )}
                    </td>
                  )}
                  {isEditable && (
                    <td className="py-2 px-2 border-b">
                      <Button
                        onClick={() => handleDeleteRow(item)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title={isAdditionalRow ? "Delete row" : "Mark row as deleted"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="footer-container">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115454-uWCS2yWrowegSqw9c2SIVcLdedTk82.png"
          alt="GreenLight Footer"
          className="w-full h-auto"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  ) : (
    // PDF/Print mode - same structure but without editing capabilities
    <>
      {dataPages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="report-page min-h-[1056px] relative">
          <div className="mb-8">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
              alt="GreenLight Logo"
              className="h-24"
              crossOrigin="anonymous"
            />
          </div>

          <div className="mb-16">
            <h2 className="text-xl font-bold mb-6">{detailsTitle}</h2>

            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 border-b">{columnHeaders.unit}</th>
                  {hasKitchenAerators && <th className="text-left py-2 px-2 border-b">{columnHeaders.kitchen}</th>}
                  {hasBathroomAerators && <th className="text-left py-2 px-2 border-b">{columnHeaders.bathroom}</th>}
                  {hasShowers && <th className="text-left py-2 px-2 border-b">{columnHeaders.shower}</th>}
                  {hasToilets && <th className="text-left py-2 px-2 border-b">{columnHeaders.toilet}</th>}
                  {hasNotes && <th className="text-left py-2 px-2 border-b">{columnHeaders.notes}</th>}
                </tr>
              </thead>
              <tbody>
                {pageData.map((item, index) => {
                  const unitValue = unitColumn ? item[unitColumn] : item.Unit
                  const kitchenAerator = kitchenAeratorColumn
                    ? getAeratorDescription(item[kitchenAeratorColumn] ?? "", "kitchen")
                    : ""
                  const bathroomAerator = bathroomAeratorColumn
                    ? getAeratorDescription(item[bathroomAeratorColumn] ?? "", "bathroom")
                    : ""
                  const shower = getShowerValue(item) // Use the new function
                  const toilet = hasToiletInstalled(item) ? "0.8 GPF" : ""

                  const compiledNotes = compileNotesForUnit(item, true)
                  const finalNote = getFinalNoteForUnit(unitValue ?? "", compiledNotes)

                  return (
                    <tr key={index}>
                      <td className="py-2 px-2 border-b">
                        {unitValue !== undefined && editedUnits[unitValue] !== undefined ? editedUnits[unitValue] : unitValue}
                      </td>
                      {hasKitchenAerators && (
                        <td className="py-2 px-2 border-b text-center">
                          {kitchenAerator === "No Touch." ? "—" : kitchenAerator}
                        </td>
                      )}
                      {hasBathroomAerators && (
                        <td className="py-2 px-2 border-b text-center">
                          {bathroomAerator === "No Touch." ? "—" : bathroomAerator}
                        </td>
                      )}
                      {hasShowers && (
                        <td className="py-2 px-2 border-b text-center">{shower === "No Touch." ? "—" : shower}</td>
                      )}
                      {hasToilets && <td className="py-2 px-2 border-b text-center">{toilet || "—"}</td>}
                      {hasNotes && <td className="py-2 px-2 border-b">{finalNote}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="footer-container">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115454-uWCS2yWrowegSqw9c2SIVcLdedTk82.png"
              alt="GreenLight Footer"
              className="w-full h-auto"
              crossOrigin="anonymous"
            />
          </div>

          <div className="absolute top-4 right-4 text-sm">Page {7 + pageIndex} of 21</div>
        </div>
      ))}
    </>
  )
}
