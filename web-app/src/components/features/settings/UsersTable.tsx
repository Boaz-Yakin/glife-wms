"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, Edit2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { UserData } from "@/services/users.service"
import { createUserAction, updateUserRoleAction, updateUserAction, deleteUserAction, resetUserPasswordAction } from "@/app/(dashboard)/settings/users/actions"

// Helper function to format US Phone number
const formatUSPhone = (phone: string) => {
  const cleaned = ('' + phone).replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3]
  }
  return phone
}

export function UsersTable({ data }: { data: UserData[] }) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<UserData | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleRoleChange = async (userId: string, newRole: string) => {
    const toastId = toast.loading("Updating role...")
    const result = await updateUserRoleAction(userId, newRole)
    if (result?.error) {
      toast.error(result.error, { id: toastId })
    } else {
      toast.success("Role updated successfully.", { id: toastId })
    }
  }

  const openEdit = (user: UserData) => {
    setEditingUser(user)
    setIsEditOpen(true)
  }

  const columns: ColumnDef<UserData>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <div className="tabular-nums">{formatUSPhone(row.original.phone)}</div>
    },
    {
      accessorKey: "email",
      header: "Login Account",
      cell: ({ row }) => <div className="text-muted-foreground text-sm">{row.original.email}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role || "PICKER"
        const userId = row.original.id
        return (
          <Select defaultValue={role} onValueChange={(val) => handleRoleChange(userId as string, val as string)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="SUPERVISOR">SUPERVISOR</SelectItem>
              <SelectItem value="PICKER">PICKER</SelectItem>
              <SelectItem value="INSPECTOR">INSPECTOR</SelectItem>
            </SelectContent>
          </Select>
        )
      }
    },
    {
      accessorKey: "last_sign_in_at",
      header: "Last Login",
      cell: ({ row }) => {
        const dateStr = row.original.last_sign_in_at
        if (!dateStr) return <span className="text-muted-foreground">-</span>
        return <div className="tabular-nums text-sm">{new Date(dateStr).toLocaleString('en-US')}</div>
      }
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.status === 'ACTIVE'
        return (
          <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      }
    },
    {
      id: "actions",
      header: "Manage",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
          <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
          Edit
        </Button>
      )
    }
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleCreateSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await createUserAction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("User successfully registered.")
      setIsCreateOpen(false)
    }
  }

  const handleEditSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await updateUserAction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("User information successfully updated.")
      setIsEditOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!editingUser) return
    if (!confirm(`Are you sure you want to delete user ${editingUser.first_name} ${editingUser.last_name}?`)) return

    setLoading(true)
    const result = await deleteUserAction(editingUser.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("User has been deleted.")
      setIsEditOpen(false)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser) return
    if (!confirm(`Are you sure you want to reset the password for ${editingUser.first_name} ${editingUser.last_name}?\n\nThe initial password will be set to 'password123', and they must change it upon their next login.`)) return

    setLoading(true)
    const result = await resetUserPasswordAction(editingUser.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Password has been reset.")
      setIsEditOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          {/* 검색 기능 */}
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          {/* @ts-ignore */}
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Register New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
              <DialogDescription>
                Add a new worker or admin to access the system.<br/>
                Initial password will be set to <strong>password123</strong>.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreateSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="first_name" className="text-right">First Name <span className="text-red-500">*</span></Label>
                  <Input id="first_name" name="first_name" placeholder="John" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="last_name" className="text-right">Last Name <span className="text-red-500">*</span></Label>
                  <Input id="last_name" name="last_name" placeholder="Doe" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right text-sm">Phone <span className="text-red-500">*</span></Label>
                  <Input id="phone" name="phone" placeholder="4041234567" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role <span className="text-red-500">*</span></Label>
                  <Select name="role" defaultValue="PICKER" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="SUPERVISOR">SUPERVISOR</SelectItem>
                      <SelectItem value="PICKER">PICKER</SelectItem>
                      <SelectItem value="INSPECTOR">INSPECTOR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user's name and phone number. (Changing phone number changes login ID)
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form action={handleEditSubmit}>
              <input type="hidden" name="user_id" value={editingUser.id} />
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_first_name" className="text-right">First Name</Label>
                  <Input id="edit_first_name" name="first_name" defaultValue={editingUser.first_name === 'N/A' ? '' : editingUser.first_name} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_last_name" className="text-right">Last Name</Label>
                  <Input id="edit_last_name" name="last_name" defaultValue={editingUser.last_name === 'N/A' ? '' : editingUser.last_name} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_phone" className="text-right text-sm">Phone</Label>
                  <Input id="edit_phone" name="phone" defaultValue={editingUser.phone === 'N/A' ? '' : editingUser.phone} placeholder="4041234567" className="col-span-3" required />
                </div>
              </div>
              <DialogFooter className="flex items-center sm:justify-between w-full">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    Reset Password
                  </Button>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
