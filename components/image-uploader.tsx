"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
// Import the safe version of the hook
import { useSafeReportContext } from "@/lib/report-context"

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void
  currentImage: string | null
  label?: string
  showResizeControls?: boolean
  // Add direct props for when context is not available
  imageSize?: number
  onImageSizeChange?: (size: number) => void
}

export default function ImageUploader({
  onImageUpload,
  currentImage,
  label = "Upload Image",
  showResizeControls = false, // We'll keep this prop but ignore it
  imageSize: propImageSize,
  onImageSizeChange,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  // Change default local image size to 80
  const [localImageSize, setLocalImageSize] = useState<number>(80)

  // Use the safe context hook that doesn't throw an error
  const reportContext = useSafeReportContext()

  // Use either context values, props, or local state
  const coverImageSize = reportContext?.coverImageSize ?? propImageSize ?? localImageSize
  const setCoverImageSize = reportContext?.setCoverImageSize ?? onImageSizeChange ?? setLocalImageSize

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true)
      const file = e.target.files[0]

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Please select an image under 5MB.")
        setIsUploading(false)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          onImageUpload(event.target.result)
        }
        setIsUploading(false)
      }
      reader.onerror = () => {
        alert("Error reading file")
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    onImageUpload("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload size={16} />
          {isUploading ? "Uploading..." : label}
        </Button>

        {currentImage && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveImage}
            className="flex items-center gap-2 text-red-500"
          >
            <X size={16} />
            Remove
          </Button>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {currentImage && (
        <div className="mt-4">
          {" "}
          {/* Increased margin-top from mt-2 to mt-4 to lower the image */}
          <img
            src={currentImage || "/placeholder.svg"}
            alt="Uploaded image"
            className="max-h-40 max-w-full object-contain border rounded"
            // Set width to 80% by default
            style={{ width: `80%` }}
          />
        </div>
      )}
    </div>
  )
}
