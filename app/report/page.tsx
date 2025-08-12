"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import ReportDetailPage from "@/components/report-detail-page"
import type { ConsolidatedUnit } from "@/lib/excel-parser"

interface CustomerInfo {
  customerName: string
  propertyName: string
  address: string
  city: string
  state: string
  zip: string
  date: string
  unitType: string
}

export default function ReportPage() {
  const router = useRouter()
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedUnit[]>([])
  const [toiletCount, setToiletCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      // Load customer info
      const storedCustomerInfo = localStorage.getItem("customerInfo")
      if (storedCustomerInfo) {
        setCustomerInfo(JSON.parse(storedCustomerInfo))
      }

      // Load consolidated data
      const storedConsolidatedData = localStorage.getItem("consolidatedData")
      if (storedConsolidatedData) {
        const parsedData = JSON.parse(storedConsolidatedData)
        setConsolidatedData(parsedData)
        console.log("Report: Loaded consolidated data:", parsedData.length, "units")

        console.log("Report Debug - First 10 units with detailed values:")
        parsedData.slice(0, 10).forEach((unit: ConsolidatedUnit, index: number) => {
          console.log(`Unit ${index + 1} (${unit.unit}):`)
          console.log("  Kitchen Count:", unit.kitchenAeratorCount, "Type:", typeof unit.kitchenAeratorCount)
          console.log("  Bathroom Count:", unit.bathroomAeratorCount, "Type:", typeof unit.bathroomAeratorCount)
          console.log("  Shower Count:", unit.showerHeadCount, "Type:", typeof unit.showerHeadCount)
          console.log("  Full Unit Object:", JSON.stringify(unit, null, 2))
        })
      }

      // Load toilet count
      const storedToiletCount = localStorage.getItem("toiletCount")
      if (storedToiletCount) {
        setToiletCount(JSON.parse(storedToiletCount))
      }
    } catch (error) {
      console.error("Error loading report data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!customerInfo || consolidatedData.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">No Data Found</h2>
            <p className="mb-4">No installation data found. Please go back and upload a file.</p>
            <Button onClick={() => router.push("/")}>Back to Upload</Button>
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
          Back to Upload
        </Button>
        <h1 className="text-2xl font-bold">Installation Report</h1>
        <div className="w-32"></div> {/* Spacer for centering */}
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid grid-cols-1">
          <TabsTrigger value="details">Detail Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ReportDetailPage consolidatedData={consolidatedData} isPreview={true} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
