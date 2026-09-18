"use client"

import * as React from "react"
import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, X, Loader2, Download } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: any[]) => Promise<{ error?: string, success?: boolean }>
}

export function BulkImportDialog({ open, onOpenChange, onImport }: BulkImportDialogProps) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [encoding, setEncoding] = useState("utf-8")
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

  const processFile = (file: File, enc = encoding) => {
    setFile(file)
    
    if (file.name.toLowerCase().endsWith(".csv")) {
      // Use PapaParse for CSV files
      Papa.parse(file, {
        header: true,
        encoding: enc,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            toast.error("Failed to parse the CSV file.")
            clearFile()
          } else {
            setParsedData(results.data)
          }
        },
        error: (error) => {
          toast.error("Failed to parse the CSV file: " + error.message)
          clearFile()
        }
      })
    } else {
      // Use XLSX for Excel files
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "array" })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const json = XLSX.utils.sheet_to_json(worksheet)
          setParsedData(json)
        } catch (error) {
          toast.error("Failed to parse the Excel file. Please ensure it is a valid .xlsx file.")
          clearFile()
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  // Re-process when encoding changes if it's a CSV
  React.useEffect(() => {
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      processFile(file, encoding)
    }
  }, [encoding])

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
            <a 
              href="/items_import_template.csv" 
              download 
              className="text-primary hover:underline font-medium inline-flex items-center ml-1"
            >
              <Download className="h-3 w-3 mr-1" />
              Download Template
            </a>
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
            <div className="border rounded-lg p-4 flex flex-col gap-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileSpreadsheet className="h-8 w-8 text-blue-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {parsedData.length} items ready to import
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile} disabled={loading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {file.name.toLowerCase().endsWith(".csv") && (
                <div className="p-3 border rounded-md bg-background/50">
                  <Label className="mb-2 block text-xs font-semibold text-muted-foreground">CSV Encoding</Label>
                  <RadioGroup defaultValue="utf-8" value={encoding} onValueChange={setEncoding} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="utf-8" id="utf-8" />
                      <Label htmlFor="utf-8" className="font-normal cursor-pointer text-sm">UTF-8 (Standard)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="euc-kr" id="euc-kr" />
                      <Label htmlFor="euc-kr" className="font-normal cursor-pointer text-sm">EUC-KR (Excel Korean)</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    If Korean characters look broken (e.g., ???), switch to EUC-KR.
                  </p>
                </div>
              )}
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
