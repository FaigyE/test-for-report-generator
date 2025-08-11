import type { InstallationData } from "./types"

/**
 * Parses an Excel file by first converting it to CSV format internally,
 * then using the same processing logic as CSV files
 * @param file The Excel file to parse
 * @returns A promise that resolves to the parsed data
 */
export async function parseExcelFile(file: File): Promise<InstallationData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)

        // Dynamically import xlsx library
        const XLSX = await import("xlsx")

        // Parse the Excel file
        const workbook = XLSX.read(data, { type: "array" })

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        console.log("Excel: Converting first sheet to CSV format...")
        console.log("Excel: Sheet name:", firstSheetName)
        console.log("Excel: Sheet range:", worksheet["!ref"])

        // Convert the Excel sheet to CSV format
        const csvString = XLSX.utils.sheet_to_csv(worksheet, {
          FS: ",", // Field separator
          RS: "\n", // Record separator
          dateNF: "yyyy-mm-dd", // Date format
          strip: false, // Don't strip whitespace - we want to detect empty cells
        })

        console.log("Excel: Converted to CSV, length:", csvString.length)
        console.log("Excel: First 500 characters of CSV:", csvString.substring(0, 500))

        // Now parse the CSV string using the same logic as CSV files
        // Import Papa Parse dynamically
        const Papa = await import("papaparse")

        const parsedCsvData = await new Promise<any[]>((csvResolve, csvReject) => {
          Papa.default.parse(csvString, {
            header: true,
            skipEmptyLines: false, // Don't skip empty lines so we can detect them
            complete: (results) => {
              console.log("Excel->CSV: Parsing complete, raw data length:", results.data.length)

              // Helper function to find the unit column by looking for headers containing "unit"
              const findUnitColumn = (headers: string[]): string => {
                // First, look for any column header that contains "unit" (case-insensitive)
                for (const header of headers) {
                  if (header.toLowerCase().includes("unit")) {
                    console.log(`Excel->CSV: Found unit column by keyword: "${header}"`)
                    return header
                  }
                }

                // Then try other apartment-related keywords
                const apartmentKeywords = ["apt", "apartment", "room"]
                for (const header of headers) {
                  const headerLower = header.toLowerCase()
                  for (const keyword of apartmentKeywords) {
                    if (headerLower.includes(keyword)) {
                      console.log(`Excel->CSV: Found unit column by apartment keyword "${keyword}": "${header}"`)
                      return header
                    }
                  }
                }

                // If no suitable column found, use the first column as a fallback
                const firstHeader = headers[0]
                console.log(`Excel->CSV: No unit column found, using first column as fallback: "${firstHeader}"`)
                return firstHeader
              }

              // Find the unit column once using the first row's headers
              if (results.data.length === 0) {
                console.log("Excel->CSV: No data rows found")
                csvResolve([])
                return
              }

              const headers = Object.keys(results.data[0])
              const unitColumnName = findUnitColumn(headers)

              // Apply the same filtering logic as CSV files
              const filteredData = []

              for (let i = 0; i < results.data.length; i++) {
                const row: any = results.data[i]

                // Use the pre-determined unit column
                const unitValue = row[unitColumnName]

                // Log each row for debugging
                console.log(
                  `Excel->CSV Row ${i + 1}: Unit column="${unitColumnName}", Unit value="${unitValue}" (type: ${typeof unitValue}, length: ${unitValue ? String(unitValue).length : "null"})`,
                )

                // Check if unit is truly empty - be very strict about this
                if (
                  unitValue === undefined ||
                  unitValue === null ||
                  unitValue === "" ||
                  (typeof unitValue === "string" && unitValue.trim() === "") ||
                  String(unitValue).trim() === ""
                ) {
                  console.log(
                    `Excel->CSV STOPPING: Found empty unit at row ${i + 1}. Unit value: "${unitValue}". Processed ${filteredData.length} valid rows.`,
                  )
                  break // Stop processing immediately when we find an empty unit
                }

                // Convert to string and trim for further checks
                const trimmedUnit = String(unitValue).trim()

                // If after trimming it's empty, stop
                if (trimmedUnit === "") {
                  console.log(
                    `Excel->CSV STOPPING: Found empty unit after trimming at row ${i + 1}. Original: "${unitValue}". Processed ${filteredData.length} valid rows.`,
                  )
                  break
                }

                // Filter out rows with non-apartment values (often headers, totals, etc.) but continue processing
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
                  "summary",
                  "totals",
                  "grand",
                  "sub total",
                ]

                if (invalidValues.some((val) => lowerUnit.includes(val))) {
                  console.log(
                    `Excel->CSV: Skipping invalid unit "${trimmedUnit}" at row ${i + 1} (contains: ${invalidValues.find((val) => lowerUnit.includes(val))})`,
                  )
                  continue // Skip this row but continue processing
                }

                // Also check if this looks like a total row by examining only the first 5 values in the row
                const allKeys = Object.keys(row)
                const first5Keys = allKeys.slice(0, 5)
                const first5Values = first5Keys.map((key) =>
                  String(row[key] || "")
                    .toLowerCase()
                    .trim(),
                )
                const containsTotalKeyword = first5Values.some((v) =>
                  invalidValues.some((invalid) => v.includes(invalid)),
                )

                if (containsTotalKeyword) {
                  console.log(
                    `Excel->CSV: Skipping total row "${trimmedUnit}" at row ${i + 1} (first 5 columns contain total keywords)`,
                  )
                  console.log(`Excel->CSV: First 5 column values:`, first5Values)
                  continue // Skip this row but continue processing
                }

                console.log(`Excel->CSV: Adding valid unit: "${trimmedUnit}"`)
                filteredData.push(row)
              }

              console.log(`Excel->CSV: Final result: ${filteredData.length} valid units processed`)

              // Sort the results using the pre-determined unit column
              const sortedData = filteredData.sort((a, b) => {
                const unitA = a[unitColumnName]
                const unitB = b[unitColumnName]

                // Try to parse as numbers first
                const numA = Number.parseInt(unitA)
                const numB = Number.parseInt(unitB)

                // If both are valid numbers, sort numerically
                if (!isNaN(numA) && !isNaN(numB)) {
                  return numA - numB
                }

                // Otherwise, sort alphabetically
                return String(unitA).localeCompare(String(unitB), undefined, { numeric: true, sensitivity: "base" })
              })

              csvResolve(sortedData)
            },
            error: (error) => csvReject(error),
          })
        })

        // Convert the parsed data to the expected format
        const formattedData = parsedCsvData.map((row: any) => {
          const formattedRow: Record<string, string> = {}

          Object.keys(row).forEach((key) => {
            // Handle null/undefined values
            let value = row[key]
            if (value === null || value === undefined) {
              value = ""
            } else {
              value = String(value).trim()
            }

            // Preserve the original column name
            formattedRow[key] = value

            // Also add lowercase version for case-insensitive matching
            formattedRow[key.toLowerCase()] = value

            // Add common variations of column names for better matching
            if (key.toLowerCase().includes("kitchen") && key.toLowerCase().includes("aerator")) {
              formattedRow["Kitchen Aerator"] = value
            }
            if (key.toLowerCase().includes("bathroom") && key.toLowerCase().includes("aerator")) {
              formattedRow["Bathroom aerator"] = value
            }
            if (key.toLowerCase().includes("shower") && key.toLowerCase().includes("head")) {
              formattedRow["Shower Head"] = value
            }
          })

          return formattedRow as InstallationData
        })

        console.log("Excel->CSV: Final formatted data sample:", formattedData.slice(0, 3))
        console.log("Excel->CSV: Final formatted data last 3:", formattedData.slice(-3))

        resolve(formattedData)
      } catch (error) {
        console.error("Excel parsing error:", error)
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Error reading Excel file"))
    }

    reader.readAsArrayBuffer(file)
  })
}
