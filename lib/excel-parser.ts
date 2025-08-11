import * as XLSX from "xlsx"

// Interface for the original Excel row data
interface OriginalExcelRow {
  [key: string]: any
}

export interface ConsolidatedUnit {
  unit: string
  kitchenAeratorCount: number
  bathroomAeratorCount: number
  showerHeadCount: number
}

export async function parseExcelFile(file: File): Promise<OriginalExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        console.log("Excel Parser: Processing file", file.name)
        console.log("Excel Parser: Extracted", jsonData.length, "rows from Excel")

        if (jsonData.length === 0) {
          throw new Error("Excel file is empty")
        }

        // Get headers from first row
        const headers = jsonData[0] as string[]
        console.log("Excel Parser: Analyzing headers:", headers)

        // Convert rows to objects using headers
        const originalData: OriginalExcelRow[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const rowObject: OriginalExcelRow = {}
          headers.forEach((header, index) => {
            if (header) {
              rowObject[header] = row[index] || ""
            }
          })

          // Find unit column
          const unitValue = findUnitValue(rowObject)
          if (unitValue && isValidUnit(unitValue)) {
            originalData.push(rowObject)
          }
        }

        console.log("Excel Parser: Preserved", originalData.length, "original rows with all", headers.length, "columns")

        // Save original data for CSV preview (with all columns)
        localStorage.setItem("rawInstallationData", JSON.stringify(originalData))

        const consolidatedData = createConsolidatedData(originalData)

        localStorage.setItem("consolidatedData", JSON.stringify(consolidatedData))

        // Also save a toilet count (can be calculated or set to 0 for now)
        localStorage.setItem("toiletCount", JSON.stringify(0))

        console.log("Excel Parser: Created", consolidatedData.length, "consolidated units")

        resolve(originalData)
      } catch (error) {
        console.error("Excel Parser: Error processing file:", error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read Excel file"))
    reader.readAsArrayBuffer(file)
  })
}

function findUnitValue(row: OriginalExcelRow): string | null {
  // Look for unit column by common names
  const unitKeys = ["unit", "Unit", "UNIT", "apt", "apartment", "room", "Room"]

  for (const key of unitKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]).trim()
    }
  }

  // Look for any key containing "unit"
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().includes("unit") && row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]).trim()
    }
  }

  return null
}

function isValidUnit(unit: string): boolean {
  if (!unit || unit.trim() === "") return false

  const lowerUnit = unit.toLowerCase().trim()
  const invalidValues = [
    "total",
    "sum",
    "average",
    "avg",
    "count",
    "header",
    "n/a",
    "na",
    "grand total",
    "subtotal",
    "summary",
    "totals",
    "grand",
    "sub total",
  ]

  return !invalidValues.some((val) => lowerUnit.includes(val))
}

function createConsolidatedData(originalData: OriginalExcelRow[]): ConsolidatedUnit[] {
  console.log("Consolidation: Starting with", originalData.length, "original rows")

  // Group rows by unit
  const unitGroups: { [unit: string]: OriginalExcelRow[] } = {}

  originalData.forEach((row) => {
    const unit = findUnitValue(row)
    if (unit) {
      if (!unitGroups[unit]) {
        unitGroups[unit] = []
      }
      unitGroups[unit].push(row)
    }
  })

  console.log("Consolidation: Grouped into", Object.keys(unitGroups).length, "units")

  // Create consolidated units by counting installations across all rows for each unit
  const consolidated: ConsolidatedUnit[] = []

  Object.entries(unitGroups).forEach(([unit, rows]) => {
    let kitchenAeratorCount = 0
    let bathroomAeratorCount = 0
    let showerHeadCount = 0

    console.log(`Consolidation: Processing unit ${unit} with ${rows.length} rows`)

    rows.forEach((row, rowIndex) => {
      // Check each column in the row for aerator installations
      Object.entries(row).forEach(([columnName, value]) => {
        if (value && isAeratorInstalled(String(value))) {
          const lowerColumnName = columnName.toLowerCase()

          // Determine type based on column name
          if (lowerColumnName.includes("kitchen")) {
            kitchenAeratorCount++
            console.log(`  Found kitchen aerator in row ${rowIndex}, column "${columnName}": ${value}`)
          } else if (lowerColumnName.includes("bathroom") || lowerColumnName.includes("bath")) {
            bathroomAeratorCount++
            console.log(`  Found bathroom aerator in row ${rowIndex}, column "${columnName}": ${value}`)
          } else if (lowerColumnName.includes("shower")) {
            showerHeadCount++
            console.log(`  Found shower in row ${rowIndex}, column "${columnName}": ${value}`)
          }
        }
      })
    })

    console.log(
      `Consolidation: Unit ${unit} totals - Kitchen: ${kitchenAeratorCount}, Bathroom: ${bathroomAeratorCount}, Shower: ${showerHeadCount}`,
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

function isAeratorInstalled(value: string): boolean {
  if (!value) return false

  const lowerValue = value.toLowerCase().trim()

  // Check for installation indicators
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
