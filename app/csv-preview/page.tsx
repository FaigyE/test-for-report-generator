"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import type { ConsolidatedUnit } from "@/lib/excel-parser"

interface CsvPreviewData {
  [key: string]: string | number
}

export default function CsvPreviewPage() {
  const router = useRouter()
  const [rawData, setRawData] = useState<CsvPreviewData[]>([])
  const [previewData, setPreviewData] = useState<CsvPreviewData[]>([])
  const [customerInfo, setCustomerInfo] = useState<any>(null)
  const [selectedUnitColumn, setSelectedUnitColumn] = useState<string>("")
  const [selectedNotesColumns, setSelectedNotesColumns] = useState<string[]>([])
  const [selectedCells, setSelectedCells] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const getUniqueColumns = (data: CsvPreviewData[]): string[] => {
    if (!data || data.length === 0) {
      console.log("CSV Preview: No data available for column detection")
      return []
    }

    const allColumns = new Set<string>()

    // Get all possible column names from the first few rows
    const rowsToCheck = Math.min(50, data.length) // Check up to 50 rows instead of 10

    console.log(`CSV Preview: Checking ${rowsToCheck} rows for column detection`)

    for (let i = 0; i < rowsToCheck; i++) {
      const row = data[i]
      if (row && typeof row === "object") {
        Object.keys(row).forEach((key) => {
          if (key && key.trim() !== "" && key !== "undefined" && key !== "null") {
            allColumns.add(key.trim())
          }
        })
      }
    }

    const columns = Array.from(allColumns).sort()
    console.log(`CSV Preview: Found ${columns.length} unique columns:`, columns)

    // Log sample data for each column to help debug
    columns.forEach((col) => {
      const sampleValues = data
        .slice(0, 3)
        .map((row) => row[col])
        .filter((val) => val !== undefined && val !== null && val !== "")
      console.log(`CSV Preview: Column "${col}" sample values:`, sampleValues)
    })

    return columns
  }

  // Load data from localStorage
  useEffect(() => {
    try {
      const storedRawData = localStorage.getItem("rawInstallationData")
      const storedCustomerInfo = localStorage.getItem("customerInfo")

      if (!storedRawData || !storedCustomerInfo) {
        console.log("CSV Preview: No stored data found, redirecting to upload")
        router.push("/")
        return
      }

      const parsedRawData = JSON.parse(storedRawData)
      const parsedCustomerInfo = JSON.parse(storedCustomerInfo)

      console.log("CSV Preview: Loaded raw data with", parsedRawData.length, "rows")
      setRawData(parsedRawData)
      setCustomerInfo(parsedCustomerInfo)

      if (parsedRawData.length > 0) {
        const columns = getUniqueColumns(parsedRawData)

        const unitColumn =
          columns.find((col) => {
            const lowerCol = col.toLowerCase()
            return (
              lowerCol.includes("unit") ||
              lowerCol.includes("apt") ||
              lowerCol.includes("apartment") ||
              lowerCol.includes("room") ||
              lowerCol.includes("suite")
            )
          }) || columns[0]

        console.log("CSV Preview: Auto-selected unit column:", unitColumn)
        setSelectedUnitColumn(unitColumn)
        setPreviewData(parsedRawData)
      }
    } catch (error) {
      console.error("CSV Preview: Error loading data:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }, [router])

  // Handle notes column selection
  const handleNotesColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      setSelectedNotesColumns((prev) => [...prev, column])
    } else {
      setSelectedNotesColumns((prev) => prev.filter((col) => col !== column))
    }
  }

  // Handle cell selection for custom notes
  const handleCellSelection = (rowIndex: number, column: string, checked: boolean) => {
    const cellKey = `${rowIndex}-${column}`
    const unitValue = previewData[rowIndex][selectedUnitColumn]

    if (checked) {
      const cellValue = previewData[rowIndex][column]
      setSelectedCells((prev) => ({
        ...prev,
        [cellKey]: `Unit ${unitValue}: ${column} = ${cellValue}`,
      }))
    } else {
      setSelectedCells((prev) => {
        const updated = { ...prev }
        delete updated[cellKey]
        return updated
      })
    }
  }

  // Process data and continue to report
  const handleContinue = () => {
    console.log("CSV Preview: Processing data with selected columns:", selectedNotesColumns)

    // Filter and process the data
    const processedData = processInstallationData(rawData, selectedUnitColumn, selectedNotesColumns, selectedCells)

    const consolidatedData = createConsolidatedDataFromRaw(rawData, selectedUnitColumn)

    // Store processed data
    localStorage.setItem("installationData", JSON.stringify(processedData.installationData))
    localStorage.setItem("toiletCount", JSON.stringify(processedData.toiletCount))
    localStorage.setItem("selectedNotesColumns", JSON.stringify(selectedNotesColumns))
    localStorage.setItem("selectedCells", JSON.stringify(selectedCells))
    localStorage.setItem("consolidatedData", JSON.stringify(consolidatedData))

    console.log("CSV Preview: Saved processed data and consolidated data, navigating to report")
    // Navigate to report
    router.push("/report")
  }

  // Process installation data with selected configuration
  const processInstallationData = (
    data: CsvPreviewData[],
    unitColumn: string,
    notesColumns: string[],
    selectedCells: Record<string, string>,
  ) => {
    const filteredData = []

    // Count toilets
    const countToilets = (data: CsvPreviewData[]) => {
      if (!data || data.length === 0) return { count: 0, totalCount: 0 }

      const firstItem = data[0]
      const toiletColumns = Object.keys(firstItem).filter(
        (key) => key.toLowerCase().includes("toilet") || key.toLowerCase().includes("wc"),
      )

      let count = 0
      data.forEach((item) => {
        toiletColumns.forEach((col) => {
          const value = item[col]?.toString().toLowerCase().trim()
          if (value === "1" || value === "yes" || value === "installed" || value === "x") {
            count++
          }
        })
      })

      return { count, totalCount: data.length }
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      const unitValue = item[unitColumn]?.toString().trim()

      if (!unitValue || unitValue === "") {
        console.log(`CSV STOPPING: Found empty unit at row ${i + 1}. Processed ${filteredData.length} valid rows.`)
        break
      }

      // Create processed item with notes from selected columns
      const processedItem: any = {
        Unit: unitValue,
        ...item,
      }

      // Add notes from selected columns
      let combinedNotes = ""
      notesColumns.forEach((col) => {
        const noteValue = item[col]?.toString().trim()
        if (noteValue && noteValue !== "") {
          combinedNotes += noteValue + " "
        }
      })

      // Add selected cell notes
      Object.entries(selectedCells).forEach(([cellKey, cellNote]) => {
        const [rowIndex] = cellKey.split("-")
        if (Number.parseInt(rowIndex) === i) {
          combinedNotes += cellNote + " "
        }
      })

      if (combinedNotes.trim()) {
        processedItem.Notes = combinedNotes.trim()
      }

      filteredData.push(processedItem)
    }

    // Sort data
    filteredData.sort((a, b) => {
      const unitA = a.Unit || ""
      const unitB = b.Unit || ""
      return unitA.localeCompare(unitB, undefined, { numeric: true, sensitivity: "base" })
    })

    // Save the selected cell data to localStorage for the notes section to use
    const toiletData = countToilets(data)

    return {
      installationData: filteredData,
      toiletCount: toiletData.count,
    }
  }

  const createConsolidatedDataFromRaw = (data: CsvPreviewData[], unitColumn: string): ConsolidatedUnit[] => {
    console.log("CSV Preview: Creating consolidated data from", data.length, "rows")

    // Group rows by unit
    const unitGroups: { [unit: string]: CsvPreviewData[] } = {}

    data.forEach((row) => {
      const unit = row[unitColumn]?.toString().trim()
      if (unit && unit !== "") {
        if (!unitGroups[unit]) {
          unitGroups[unit] = []
        }
        unitGroups[unit].push(row)
      }
    })

    console.log("CSV Preview: Grouped into", Object.keys(unitGroups).length, "units")

    // Create consolidated units by counting installations across all rows for each unit
    const consolidated: ConsolidatedUnit[] = []

    Object.entries(unitGroups).forEach(([unit, rows]) => {
      const kitchenColumns = new Set<string>()
      const bathroomColumns = new Set<string>()
      const showerColumns = new Set<string>()

      console.log(`CSV Preview: Processing unit ${unit} with ${rows.length} rows`)

      rows.forEach((row, rowIndex) => {
        Object.entries(row).forEach(([columnName, value]) => {
          if (value && isAeratorInstalled(String(value))) {
            const lowerColumnName = String(columnName).toLowerCase()

            if (lowerColumnName.includes("kitchen")) {
              kitchenColumns.add(columnName)
              console.log(`  Found kitchen aerator in row ${rowIndex}, column "${columnName}": ${value}`)
            } else if (lowerColumnName.includes("bathroom") || lowerColumnName.includes("bath")) {
              bathroomColumns.add(columnName)
              console.log(`  Found bathroom aerator in row ${rowIndex}, column "${columnName}": ${value}`)
            } else if (lowerColumnName.includes("shower")) {
              showerColumns.add(columnName)
              console.log(`  Found shower in row ${rowIndex}, column "${columnName}": ${value}`)
            }
          }
        })
      })

      const kitchenAeratorCount = kitchenColumns.size
      const bathroomAeratorCount = bathroomColumns.size
      const showerHeadCount = showerColumns.size

      console.log(
        `CSV Preview: Unit ${unit} totals - Kitchen: ${kitchenAeratorCount}, Bathroom: ${bathroomAeratorCount}, Shower: ${showerHeadCount}`,
      )

      consolidated.push({
        unit,
        kitchenAeratorCount,
        bathroomAeratorCount,
        showerHeadCount,
      })
    })

    // Sort consolidated data
    return consolidated.sort((a, b) => {
      const numA = Number.parseInt(a.unit)
      const numB = Number.parseInt(b.unit)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      return a.unit.localeCompare(b.unit, undefined, { numeric: true, sensitivity: "base" })
    })
  }

  // Aerator detection function
  const isAeratorInstalled = (value: string): boolean => {
    if (!value || typeof value !== "string") return false

    const lowerValue = value.toLowerCase().trim()

    return (
      lowerValue === "male" ||
      lowerValue === "female" ||
      lowerValue === "insert" ||
      lowerValue.includes("gpm") ||
      lowerValue === "1" ||
      lowerValue === "2" ||
      lowerValue === "yes" ||
      lowerValue === "installed" ||
      lowerValue === "x"
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!customerInfo || rawData.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">No Data Found</h2>
            <p className="mb-4">No data found. Please go back and upload a file.</p>
            <Button onClick={() => router.push("/")}>Back to Upload</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const availableColumns = getUniqueColumns(previewData)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Upload
        </Button>
        <h1 className="text-2xl font-bold">Data Preview & Configuration</h1>
        <Button onClick={handleContinue} disabled={!selectedUnitColumn}>
          Continue to Report
        </Button>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-800">
          Found {availableColumns.length} columns in your data. Select which columns contain notes below.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Check the browser console (F12) for detailed column information if you're missing expected columns.
        </p>
      </div>

      {/* Data Preview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            Data Preview ({previewData.length} rows, {availableColumns.length} columns)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  {availableColumns.map((column) => (
                    <th key={column} className="border border-gray-300 px-2 py-1 text-left font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {availableColumns.map((column) => (
                      <td key={column} className="border border-gray-300 px-2 py-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCells[`${rowIndex}-${column}`] !== undefined}
                            onCheckedChange={(checked) => handleCellSelection(rowIndex, column, checked as boolean)}
                          />
                          <span className="truncate max-w-[100px]" title={row[column]?.toString()}>
                            {row[column]?.toString() || ""}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">Showing first 10 rows of {previewData.length} total rows</p>
          )}
        </CardContent>
      </Card>

      {/* Column Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unit Column Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Unit Column</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUnitColumn} onValueChange={setSelectedUnitColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit column" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Notes Columns Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Notes Columns ({availableColumns.length} available)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableColumns.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`notes-${column}`}
                    checked={selectedNotesColumns.includes(column)}
                    onCheckedChange={(checked) => handleNotesColumnToggle(column, checked as boolean)}
                  />
                  <label
                    htmlFor={`notes-${column}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column}
                  </label>
                </div>
              ))}
            </div>
            {selectedNotesColumns.length > 0 && (
              <div className="mt-4 p-2 bg-blue-50 rounded">
                <p className="text-sm font-medium">Selected notes columns:</p>
                <p className="text-sm text-gray-600">{selectedNotesColumns.join(", ")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Cells Summary */}
      {Object.keys(selectedCells).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Selected Cells for Custom Notes ({Object.keys(selectedCells).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {Object.values(selectedCells).map((cellNote, index) => (
                <p key={index} className="text-sm text-gray-600">
                  {cellNote}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
