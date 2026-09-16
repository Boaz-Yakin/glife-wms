"use client"

import * as React from "react"
import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: any[]) => Promise<{ error?: string, success?: boolean }>
}

export function BulkImportDialog({ open, onOpenChange, onImport }: BulkImportDialogProps) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }

  const processFile = (file: File) => {
    setFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)
        setParsedData(json)
      } catch (error) {
        toast.error("Failed to parse the file. Please ensure it is a valid Excel or CSV file.")
        clearFile()
      }
    }
    reader.readAsBinaryString(file)
  }

  const clearFile = () => {
    setFile(null)
    setParsedData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setLoading(true)
    try {
      const result = await onImport(parsedData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Successfully imported ${parsedData.length} items.`)
        onOpenChange(false)
        clearFile()
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred during import.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val)
        if (!val) clearFile()
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Items</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to register multiple items at once.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!file ? (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Click or drag file to upload</p>
              <p className="text-xs text-muted-foreground">Supports .csv, .xlsx</p>
              <input
                type="file"
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileSpreadsheet className="h-8 w-8 text-blue-500 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.length} items found
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile} disabled={loading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md">
            <strong>Note:</strong> Required columns are <code>sku</code>, <code>name_en</code>, <code>uom</code>, <code>zone_type</code>. Ensure headers match the template exactly.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || parsedData.length === 0 || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {parsedData.length > 0 ? `(${parsedData.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
