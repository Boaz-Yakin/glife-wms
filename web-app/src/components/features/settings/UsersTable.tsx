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
    const toastId = toast.loading("권한을 변경하는 중...")
    const result = await updateUserRoleAction(userId, newRole)
    if (result?.error) {
      toast.error(result.error, { id: toastId })
    } else {
      toast.success("권한이 성공적으로 변경되었습니다.", { id: toastId })
    }
  }

  const openEdit = (user: UserData) => {
    setEditingUser(user)
    setIsEditOpen(true)
  }

  const columns: ColumnDef<UserData>[] = [
    {
      id: "name",
      header: "이름",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "전화번호",
      cell: ({ row }) => <div className="tabular-nums">{formatUSPhone(row.original.phone)}</div>
    },
    {
      accessorKey: "email",
      header: "로그인 계정",
      cell: ({ row }) => <div className="text-muted-foreground text-sm">{row.original.email}</div>,
    },
    {
      accessorKey: "role",
      header: "역할(Role)",
      cell: ({ row }) => {
        const role = row.original.role || "PICKER"
        const userId = row.original.id
        return (
          <Select defaultValue={role} onValueChange={(val) => handleRoleChange(userId as string, val as string)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="역할 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">관리자 (ADMIN)</SelectItem>
              <SelectItem value="SUPERVISOR">감독자 (SUPERVISOR)</SelectItem>
              <SelectItem value="PICKER">피커 (PICKER)</SelectItem>
              <SelectItem value="INSPECTOR">검수자 (INSPECTOR)</SelectItem>
            </SelectContent>
          </Select>
        )
      }
    },
    {
      accessorKey: "last_sign_in_at",
      header: "최근 로그인",
      cell: ({ row }) => {
        const dateStr = row.original.last_sign_in_at
        if (!dateStr) return <span className="text-muted-foreground">-</span>
        return <div className="tabular-nums text-sm">{new Date(dateStr).toLocaleString('ko-KR')}</div>
      }
    },
    {
      id: "status",
      header: "상태",
      cell: ({ row }) => {
        const isActive = row.original.status === 'ACTIVE'
        return (
          <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-600" : ""}>
            {isActive ? '활성' : '비활성'}
          </Badge>
        )
      }
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
          <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
          수정
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
      toast.success("사용자가 성공적으로 등록되었습니다.")
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
      toast.success("사용자 정보가 성공적으로 수정되었습니다.")
      setIsEditOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!editingUser) return
    if (!confirm(`${editingUser.first_name} ${editingUser.last_name} 사용자를 정말 삭제하시겠습니까?`)) return

    setLoading(true)
    const result = await deleteUserAction(editingUser.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("사용자가 삭제되었습니다.")
      setIsEditOpen(false)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser) return
    if (!confirm(`${editingUser.first_name} ${editingUser.last_name} 사용자의 비밀번호를 초기화하시겠습니까?\n\n초기 비밀번호는 'password123'으로 설정되며, 다음 로그인 시 새 비밀번호로 변경해야 합니다.`)) return

    setLoading(true)
    const result = await resetUserPasswordAction(editingUser.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("비밀번호가 초기화되었습니다.")
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
              신규 사용자 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>신규 사용자 등록</DialogTitle>
              <DialogDescription>
                시스템에 접속할 새로운 작업자를 추가합니다.<br/>
                초기 비밀번호는 <strong>password123</strong> 으로 일괄 설정됩니다.
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
                  <Label htmlFor="phone" className="text-right text-sm">전화번호 <span className="text-red-500">*</span></Label>
                  <Input id="phone" name="phone" placeholder="4041234567" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">역할 <span className="text-red-500">*</span></Label>
                  <Select name="role" defaultValue="PICKER" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="역할 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">관리자 (ADMIN)</SelectItem>
                      <SelectItem value="SUPERVISOR">감독자 (SUPERVISOR)</SelectItem>
                      <SelectItem value="PICKER">피커 (PICKER)</SelectItem>
                      <SelectItem value="INSPECTOR">검수자 (INSPECTOR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  등록 완료
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
                  조회된 사용자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 정보 수정 다이얼로그 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>사용자 정보 수정</DialogTitle>
            <DialogDescription>
              사용자의 이름과 전화번호를 수정합니다. (전화번호 변경 시 로그인 아이디도 변경됩니다)
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
                  <Label htmlFor="edit_phone" className="text-right text-sm">전화번호</Label>
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
                    삭제
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    비밀번호 초기화
                  </Button>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
