"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { parseExcelFile } from "@/lib/excel-parser"

export default function Home() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [propertyName, setPropertyName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [loading, setLoading] = useState(false)
  const [unitType, setUnitType] = useState("Unit")
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<number>(80)
  const [formImage, setFormImage] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  // Helper function to find the unit column by looking for headers containing "unit"
  const findUnitColumn = (row: any): { value: any; columnName: string } => {
    // First, look for any column header that contains "unit" (case-insensitive)
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes("unit")) {
        console.log(`CSV: Found unit column by keyword: "${key}"`)
        return { value: row[key], columnName: key }
      }
    }

    // Then try other apartment-related keywords
    const apartmentKeywords = ["apt", "apartment", "room"]
    for (const key of Object.keys(row)) {
      const keyLower = key.toLowerCase()
      for (const keyword of apartmentKeywords) {
        if (keyLower.includes(keyword)) {
          console.log(`CSV: Found unit column by apartment keyword "${keyword}": "${key}"`)
          return { value: row[key], columnName: key }
        }
      }
    }

    // If no suitable column found, use the first column as a fallback
    const firstKey = Object.keys(row)[0]
    console.log(`CSV: No unit column found, using first column as fallback: "${firstKey}"`)
    return { value: row[firstKey], columnName: firstKey }
  }

  // Shared CSV processing function
  const processCsvData = async (csvString: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: false, // Don't skip empty lines so we can detect them
        complete: (results) => {
          console.log("CSV parsing complete, raw data length:", results.data.length)

          // Apply the same filtering logic
          const filteredData = []

          for (let i = 0; i < results.data.length; i++) {
            const row: any = results.data[i]

            // Use the improved unit column detection
            const { value: unitValue, columnName: unitColumnName } = findUnitColumn(row)

            // Log each row for debugging
            console.log(
              `CSV Row ${i + 1}: Unit column="${unitColumnName}", Unit value="${unitValue}" (type: ${typeof unitValue}, length: ${unitValue ? String(unitValue).length : "null"})`,
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
                `CSV STOPPING: Found empty unit at row ${i + 1}. Unit value: "${unitValue}". Processed ${filteredData.length} valid rows.`,
              )
              break // Stop processing immediately when we find an empty unit
            }

            // Convert to string and trim for further checks
            const trimmedUnit = String(unitValue).trim()

            // If after trimming it's empty, stop
            if (trimmedUnit === "") {
              console.log(
                `CSV STOPPING: Found empty unit after trimming at row ${i + 1}. Original: "${unitValue}". Processed ${filteredData.length} valid rows.`,
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
              "n/a",
              "na",
              "grand total",
              "subtotal",
              "summary",
              "totals",
              "grand",
              "sub total",
            ]

            if (invalidValues.some((val) => lowerUnit.includes(val))) {
              console.log(
                `CSV: Skipping invalid unit "${trimmedUnit}" at row ${i + 1} (contains: ${invalidValues.find((val) => lowerUnit.includes(val))})`,
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
            const containsTotalKeyword = first5Values.some((v) => invalidValues.some((invalid) => v.includes(invalid)))

            if (containsTotalKeyword) {
              console.log(
                `CSV: Skipping total row "${trimmedUnit}" at row ${i + 1} (first 5 columns contain total keywords)`,
              )
              console.log(`CSV: First 5 column values:`, first5Values)
              continue // Skip this row but continue processing
            }

            console.log(`CSV: Adding valid unit: "${trimmedUnit}"`)

            // Create a normalized version of the row with a consistent "Unit" property
            const normalizedRow = { ...row }
            normalizedRow.Unit = unitValue // Ensure there's always a "Unit" property
            normalizedRow._originalUnitColumn = unitColumnName // Store the original column name for reference

            filteredData.push(normalizedRow)
          }

          console.log(`CSV: Final result: ${filteredData.length} valid units processed`)

          // Sort the results
          const sortedData = filteredData.sort((a, b) => {
            const unitA = a.Unit
            const unitB = b.Unit

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

          resolve(sortedData)
        },
        error: (error) => reject(error),
      })
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)

    try {
      // Check file extension to determine how to parse
      const fileExtension = file.name.split(".").pop()?.toLowerCase()
      let parsedData: any[] = []

      console.log(`Processing ${fileExtension} file: ${file.name}`)

      if (fileExtension === "csv") {
        // Parse CSV file directly
        const csvText = await file.text()
        parsedData = await processCsvData(csvText)
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        // Parse Excel file - it will be converted to CSV internally and use the same processing logic
        parsedData = await parseExcelFile(file)
      } else {
        throw new Error("Unsupported file format. Please upload a CSV or Excel file.")
      }

      console.log(`Final parsed data length: ${parsedData.length}`)
      console.log("Sample of final data:", parsedData.slice(0, 3))
      console.log("Last 3 rows of final data:", parsedData.slice(-3))

      // Store data in localStorage
      localStorage.setItem("rawInstallationData", JSON.stringify(parsedData))
      localStorage.setItem(
        "customerInfo",
        JSON.stringify({
          customerName,
          propertyName,
          address,
          city,
          state,
          zip,
          date: new Date().toLocaleDateString(),
          unitType,
        }),
      )

      // Save coverImage and imageSize to localStorage
      localStorage.setItem("coverImage", JSON.stringify(formImage))
      localStorage.setItem("coverImageSize", JSON.stringify(imageSize))

      // Navigate to CSV preview page instead of report page
      router.push("/csv-preview")
    } catch (error) {
      console.error("Error parsing file:", error)
      alert(error instanceof Error ? error.message : "An error occurred while processing the file")
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-29%20115501-BD1uw5tVq9PtVYW6Z6FKM1i8in6GeV.png"
          alt="GreenLight Logo"
          className="h-16 mr-4"
        />
        <h1 className="text-3xl font-bold">Water Conservation Installation Report Generator</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Customer Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property Name</Label>
                  <Input
                    id="propertyName"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitType">Unit Type</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="unitTypeUnit"
                      name="unitType"
                      value="Unit"
                      checked={unitType === "Unit"}
                      onChange={(e) => setUnitType(e.target.value)}
                      className="mr-2"
                    />
                    <Label htmlFor="unitTypeUnit">Unit</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="unitTypeRoom"
                      name="unitType"
                      value="Room"
                      checked={unitType === "Room"}
                      onChange={(e) => setUnitType(e.target.value)}
                      className="mr-2"
                    />
                    <Label htmlFor="unitTypeRoom">Room</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formImage">Cover Image (Optional)</Label>
              <p className="text-sm text-muted-foreground">Upload an image to display on the cover page</p>
              <Input
                id="formImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0]
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      setFormImage(event.target?.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              {formImage && (
                <div className="mt-4">
                  <img
                    src={formImage || "/placeholder.svg"}
                    alt="Cover preview"
                    className="w-full max-w-4xl mx-auto border rounded-lg"
                    style={{
                      width: "85%",
                      aspectRatio: "16/9",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Installation Data</h2>
              <p className="text-sm text-muted-foreground">Upload the CSV or Excel file containing installation data</p>
              <Input id="csvFile" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Generate Report"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
