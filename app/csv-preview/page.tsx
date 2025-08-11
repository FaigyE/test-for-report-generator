"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CustomerInfo, InstallationData } from "@/lib/types"

interface CsvPreviewData {
  [key: string]: string | undefined
}

export default function CsvPreviewPage() {
  const router = useRouter()
  const [rawData, setRawData] = useState<CsvPreviewData[]>([])
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUnitColumn, setSelectedUnitColumn] = useState<string>("")
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [selectedNotesColumns, setSelectedNotesColumns] = useState<string[]>([])
  const [selectedCells, setSelectedCells] = useState<Record<string, string[]>>({})
  const [previewData, setPreviewData] = useState<CsvPreviewData[]>([])

  // Helper function to get proper case for column names
  const getProperCase = (str: string): string => {
    if (!str) return str

    // Handle common abbreviations and special cases
    const specialCases: Record<string, string> = {
      gpm: "GPM",
      gpf: "GPF",
      bldg: "Building",
      apt: "Apartment",
      id: "ID",
      usa: "USA",
      us: "US",
      ca: "CA",
      ny: "NY",
      tx: "TX",
      fl: "FL",
    }

    // Split by common delimiters and process each part
    return str
      .split(/[\s\-_/]+/)
      .map((word) => {
        const lowerWord = word.toLowerCase()
        if (specialCases[lowerWord]) {
          return specialCases[lowerWord]
        }
        // Capitalize first letter, keep rest as is (preserving existing case)
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(" ")
  }

  // Helper function to get unique columns with proper case
  const getUniqueColumns = (data: CsvPreviewData[]): string[] => {
    if (!data || data.length === 0) return []

    const allKeys = Object.keys(data[0])
    const uniqueColumns: string[] = []
    const seenLowerCase = new Set<string>()

    for (const key of allKeys) {
      if (!key || key.trim() === "") continue

      const lowerKey = key.toLowerCase().trim()
      if (!seenLowerCase.has(lowerKey)) {
        seenLowerCase.add(lowerKey)
        uniqueColumns.push(key) // Keep original case from CSV
      }
    }

    return uniqueColumns
  }

  // Load data from localStorage
  useEffect(() => {
    try {
      const storedRawData = localStorage.getItem("rawInstallationData")
      const storedCustomerInfo = localStorage.getItem("customerInfo")

      if (!storedRawData || !storedCustomerInfo) {
        router.push("/")
        return
      }

      const parsedRawData = JSON.parse(storedRawData)
      const parsedCustomerInfo = JSON.parse(storedCustomerInfo)

      setRawData(parsedRawData)
      setCustomerInfo(parsedCustomerInfo)

      if (parsedRawData.length > 0) {
        const columns = getUniqueColumns(parsedRawData)
        setAvailableColumns(columns)

        // Auto-detect unit column
        const unitColumn = findUnitColumn(columns)
        if (unitColumn) {
          setSelectedUnitColumn(unitColumn)
        }

        // Show all rows for preview
        setPreviewData(parsedRawData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }, [router])

  // Auto-detect unit column
  const findUnitColumn = (columns: string[]): string | null => {
    // Filter out empty columns first
    const validColumns = columns.filter((col) => col && col.trim() !== "")

    // First, look for exact matches (case insensitive)
    for (const col of validColumns) {
      const lowerCol = col.toLowerCase()
      if (lowerCol === "unit" || lowerCol === "bldg/unit" || lowerCol === "building/unit") {
        return col
      }
    }

    // Then look for columns containing unit-related keywords
    const unitKeywords = ["unit", "apt", "apartment", "room"]
    for (const col of validColumns) {
      const colLower = col.toLowerCase()
      for (const keyword of unitKeywords) {
        if (colLower.includes(keyword)) {
          return col
        }
      }
    }

    return null
  }

  // Handle cell selection for notes
const handleCellToggle = (rowIndex: number, column: string, value: string) => {
  const unitValue = previewData[rowIndex][selectedUnitColumn]
  if (!unitValue) return

  setSelectedCells((prev) => {
    const unitCells = prev[unitValue] || []
    const cellIdentifier = `${value}` // Removed column name

    const isSelected = unitCells.includes(cellIdentifier)

    if (isSelected) {
      // Remove cell
      const updatedCells = unitCells.filter((cell) => cell !== cellIdentifier)
      if (updatedCells.length === 0) {
        const { [unitValue]: removed, ...rest } = prev
        return rest
      }
      return { ...prev, [unitValue]: updatedCells }
    } else {
      // Add cell
      return { ...prev, [unitValue]: [...unitCells, cellIdentifier] }
    }
  })
}

  // Check if a cell is selected
  const isCellSelected = (rowIndex: number, column: string, value: string): boolean => {
    const unitValue = previewData[rowIndex][selectedUnitColumn]
    if (!unitValue) return false

    const unitCells = selectedCells[unitValue] || []
    const cellIdentifier = `${getProperCase(column)}: ${value}`
    return unitCells.includes(cellIdentifier)
  }

  // Process data and continue to report
  const handleContinue = () => {
    if (!selectedUnitColumn) {
      alert("Please select a unit column")
      return
    }

    // Filter and process the data
    const processedData = processInstallationData(rawData, selectedUnitColumn, selectedNotesColumns, selectedCells)

    // Store processed data
    localStorage.setItem("installationData", JSON.stringify(processedData.installationData))
    localStorage.setItem("toiletCount", JSON.stringify(processedData.toiletCount))

    // Navigate to report
    router.push("/report")
  }

  // Process installation data with selected configuration
  const processInstallationData = (
    data: CsvPreviewData[],
    unitColumn: string,
    notesColumns: string[],
    cellSelections: Record<string, string[]>,
  ) => {
    const filteredData = []
    let toiletCount = 0

    // Get toilet column info
    const getToiletInfo = () => {
      if (!data || data.length === 0) return { count: 0, totalCount: 0 }

      const firstItem = data[0]
      const toiletColumn = Object.keys(firstItem).find((key) => key.startsWith("Toilets Installed:"))

      if (!toiletColumn) return { count: 0, totalCount: 0 }

      const totalCountMatch = toiletColumn.match(/Toilets Installed:\s*(\d+)/)
      const totalCount = totalCountMatch ? Number.parseInt(totalCountMatch[1]) : 0

      let count = 0
      data.forEach((item) => {
        if (item[toiletColumn] && item[toiletColumn] !== "") {
          count++
        }
      })

      return { count, totalCount }
    }

    const { totalCount } = getToiletInfo()
    toiletCount = totalCount

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      const unitValue = item[unitColumn]

      // Stop at first empty unit
      if (!unitValue || unitValue.trim() === "") {
        console.log(`Stopping at row ${i + 1} - empty unit`)
        break
      }

      const trimmedUnit = unitValue.trim()

      // Skip invalid units
      const lowerUnit = trimmedUnit.toLowerCase()
      const invalidValues = ["total", "sum", "average", "avg", "count", "header", "n/a", "na"]
      if (invalidValues.some((val) => lowerUnit.includes(val))) {
        console.log(`Skipping invalid unit: ${trimmedUnit}`)
        continue
      }

      // Create processed item
      const processedItem: InstallationData = {
        Unit: trimmedUnit,
        "Shower Head": item["Shower Head"] || "",
        "Bathroom aerator": item["Bathroom aerator"] || "",
        "Kitchen Aerator": item["Kitchen Aerator"] || "",
        "Leak Issue Kitchen Faucet": item["Leak Issue Bath Faucet"] || "",
        "Leak Issue Bath Faucet": item["Leak Issue Bath Faucet"] || "",
        "Tub Spout/Diverter Leak Issue": item["Tub Spout/Diverter Leak Issue"] || "",
        Notes: "",
      }

      // Add all original columns
      Object.keys(item).forEach((key) => {
        if (item[key] !== undefined) {
          processedItem[key] = item[key]
        }
      })

      // Add notes from selected columns
      let additionalNotes = ""

      // Add notes from selected columns
      notesColumns.forEach((column) => {
        const value = item[column]
        if (value && value.trim() !== "") {
          const sentenceCaseValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          additionalNotes += `${sentenceCaseValue}. `
        }
      })

      // Add notes from selected cells
      const unitCells = cellSelections[trimmedUnit] || []
      unitCells.forEach((cellInfo) => {
        additionalNotes += `${cellInfo}. `
      })

      if (additionalNotes) {
        processedItem.Notes = additionalNotes.trim()
      }

      filteredData.push(processedItem)
    }

    // Sort by unit number
    filteredData.sort((a, b) => {
      const numA = Number.parseInt(a.Unit)
      const numB = Number.parseInt(b.Unit)

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      return a.Unit.localeCompare(b.Unit, undefined, { numeric: true, sensitivity: "base" })
    })

    // Save the selected cell data to localStorage for the notes section to use
    console.log("Saving selected cells to localStorage:", cellSelections)
    localStorage.setItem("selectedCells", JSON.stringify(cellSelections))
    localStorage.setItem("selectedNotesColumns", JSON.stringify(notesColumns))

    return {
      installationData: filteredData,
      toiletCount,
    }
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
            <Button onClick={() => router.push("/")}>Back to Form</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Form
        </Button>
        <h1 className="text-2xl font-bold">Data Preview & Configuration</h1>
        <Button onClick={handleContinue} disabled={!selectedUnitColumn}>
          Continue to Report
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Unit Column Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Unit Column</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="unit-column">Select the column that contains unit numbers:</Label>
            <Select value={selectedUnitColumn} onValueChange={setSelectedUnitColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit column" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns
                  .filter((column) => column && column.trim() !== "") // Filter out empty columns
                  .map((column) => (
                    <SelectItem key={column} value={column}>
                      {getProperCase(column)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Notes Columns Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Select columns to include in notes:</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableColumns
                .filter((col) => col !== selectedUnitColumn)
                .map((column) => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`notes-${column}`}
                      checked={selectedNotesColumns.includes(column)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNotesColumns((prev) => [...prev, column])
                        } else {
                          setSelectedNotesColumns((prev) => prev.filter((col) => col !== column))
                        }
                      }}
                    />
                    <Label htmlFor={`notes-${column}`} className="text-sm">
                      {getProperCase(column)}
                    </Label>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Cells Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Cells</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Click on cells in the preview to add them to notes for specific units.
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(selectedCells).map(([unit, cells]) => (
                <div key={unit} className="text-sm">
                  <strong>Unit {unit}:</strong>
                  <ul className="ml-4 text-xs">
                    {cells.map((cell, index) => (
                      <li key={index}>• {cell}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {Object.keys(selectedCells).length === 0 && (
                <p className="text-xs text-muted-foreground">No cells selected</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview ({previewData.length} rows)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on cells to add them to notes for specific units. The selected unit column is highlighted.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  {availableColumns.map((column) => (
                    <th
                      key={column}
                      className={`text-left p-2 border-b font-medium ${
                        column === selectedUnitColumn ? "bg-blue-100" : ""
                      }`}
                    >
                      {getProperCase(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {availableColumns.map((column) => {
                      const value = row[column] || ""
                      const isUnitColumn = column === selectedUnitColumn
                      const isSelected = !isUnitColumn && isCellSelected(rowIndex, column, value)

                      return (
                        <td
                          key={column}
                          className={`p-2 border-b cursor-pointer ${isUnitColumn ? "bg-blue-50 font-medium" : ""} ${
                            isSelected ? "bg-green-100" : ""
                          } ${!isUnitColumn && value ? "hover:bg-yellow-50" : ""}`}
                          onClick={() => {
                            if (!isUnitColumn && value && selectedUnitColumn) {
                              handleCellToggle(rowIndex, column, value)
                            }
                          }}
                          title={
                            !isUnitColumn && value
                              ? `Click to ${isSelected ? "remove from" : "add to"} notes for unit ${row[selectedUnitColumn]}`
                              : ""
                          }
                        >
                          {value}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Form
        </Button>
        <Button onClick={handleContinue} disabled={!selectedUnitColumn}>
          Continue to Report
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
