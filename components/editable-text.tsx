"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  placeholder?: string
  displayValue?: string // Add this new prop
}

export default function EditableText({
  value,
  onChange,
  className = "",
  multiline = false,
  placeholder = "Click to edit",
  displayValue, // Add this parameter
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  // Remove this line:
  // const { setHasUnsavedChanges } = useReportContext()

  // Update local state when prop value changes
  useEffect(() => {
    setText(value)
  }, [value])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (text !== value) {
      onChange(text)
      // Remove this line:
      // setHasUnsavedChanges(true)
      console.log(`Text changed from "${value}" to "${text}"`)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-1 border border-gray-300 rounded ${className}`}
          rows={Math.max(3, text.split("\n").length)}
          placeholder={placeholder}
        />
      )
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full p-1 border border-gray-300 rounded ${className}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-100 p-1 rounded ${className} ${!value ? "text-gray-400 italic" : ""}`}
    >
      {displayValue || value || placeholder}
    </div>
  )
}
