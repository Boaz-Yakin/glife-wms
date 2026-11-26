'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  KeyRound, 
  Plus, 
  Search, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { WarehouseOperator, OperatorRole } from '@/types/operator';
import {
  createOperatorAction,
  updateOperatorPinAction,
  toggleOperatorActiveAction,
  deleteOperatorAction,
} from '@/app/(dashboard)/inventory/operators/actions';

interface OperatorsManagementClientProps {
  initialOperators: WarehouseOperator[];
}

export function OperatorsManagementClient({ initialOperators }: OperatorsManagementClientProps) {
  const [operators, setOperators] = useState<WarehouseOperator[]>(initialOperators);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // 비밀번호 표시 여부 (operatorId -> boolean)
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // 신규 등록 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [createRole, setCreateRole] = useState<OperatorRole>('OPERATOR');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // PIN 재설정 모달
  const [pinTarget, setPinTarget] = useState<WarehouseOperator | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // 토스트 알림
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 통계 계산
  const stats = useMemo(() => {
    const total = operators.length;
    const active = operators.filter((o) => o.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [operators]);

  // 필터링된 목록
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      if (statusFilter === 'ACTIVE' && !op.is_active) return false;
      if (statusFilter === 'INACTIVE' && op.is_active) return false;

      if (searchQuery.trim()) {
        const sq = searchQuery.trim().toLowerCase();
        return (
          op.name.toLowerCase().includes(sq) ||
          op.role.toLowerCase().includes(sq)
        );
      }
      return true;
    });
  }, [operators, statusFilter, searchQuery]);

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 신규 등록 핸들러
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError('작업자 이름을 입력해주세요.');
      return;
    }
    if (!/^\d{4}$/.test(createPin.trim())) {
      setCreateError('PIN은 4자리 숫자여야 합니다.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await createOperatorAction({
        name: createName.trim(),
        pin_code: createPin.trim(),
        role: createRole,
      });

      if (res.data) {
        setOperators((prev) => [res.data!, ...prev]);
        setShowCreateModal(false);
        setCreateName('');
        setCreatePin('');
        setCreateRole('OPERATOR');
        showToast(`작업자 '${res.data.name}'이(가) 등록되었습니다.`);
      } else {
        setCreateError(res.error || '작업자 생성 실패');
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  // PIN 재설정 핸들러
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTarget) return;

    if (!/^\d{4}$/.test(newPin.trim())) {
      setPinError('새 PIN은 4자리 숫자여야 합니다.');
      return;
    }

    setPinLoading(true);
    setPinError(null);
    try {
      const res = await updateOperatorPinAction(pinTarget.id, newPin.trim());
      if (res.success) {
        setOperators((prev) =>
          prev.map((o) => (o.id === pinTarget.id ? { ...o, pin_code: newPin.trim() } : o))
        );
        showToast(`'${pinTarget.name}'의 PIN이 변경되었습니다.`);
        setPinTarget(null);
        setNewPin('');
      } else {
        setPinError(res.error || 'PIN 재설정 실패');
      }
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setPinLoading(false);
    }
  };

  // 활성/비활성 토글 핸들러
  const handleToggleActive = async (op: WarehouseOperator) => {
    if (op.name === '관리자' && op.is_active) {
      showToast('기본 관리자 계정은 비활성화할 수 없습니다.', true);
      return;
    }

    const nextState = !op.is_active;
    try {
      const res = await toggleOperatorActiveAction(op.id, nextState);
      if (res.success) {
        setOperators((prev) =>
          prev.map((o) => (o.id === op.id ? { ...o, is_active: nextState } : o))
        );
        showToast(`'${op.name}' 상태가 ${nextState ? '활성(재직)' : '비활성(정지)'}으로 변경되었습니다.`);
      } else {
        showToast(res.error || '상태 변경 실패', true);
      }
    } catch {
      showToast('상태 변경 중 오류가 발생했습니다.', true);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (op: WarehouseOperator) => {
    if (op.name === '관리자') {
      showToast('기본 관리자 계정은 삭제할 수 없습니다.', true);
      return;
    }

    if (!window.confirm(`'${op.name}' 작업자를 완전히 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await deleteOperatorAction(op.id);
      if (res.success) {
        setOperators((prev) => prev.filter((o) => o.id !== op.id));
        showToast(`'${op.name}' 작업자가 삭제되었습니다.`);
      } else {
        showToast(res.error || '삭제 실패', true);
      }
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 토스트 알림 */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toastMsg.isError ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toastMsg.isError ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Operators</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">{stats.total}명</h3>
            <p className="text-xs text-muted-foreground mt-0.5">등록된 전체 작업자</p>
          </div>
          <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="size-6" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active</p>
            <h3 className="text-2xl font-black mt-1 text-emerald-600">{stats.active}명</h3>
            <p className="text-xs text-muted-foreground mt-0.5">WMS-G 로그인 가능</p>
          </div>
          <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="size-6" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inactive</p>
            <h3 className="text-2xl font-black mt-1 text-slate-500">{stats.inactive}명</h3>
            <p className="text-xs text-muted-foreground mt-0.5">퇴사 또는 접속 정지</p>
          </div>
          <div className="size-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <UserX className="size-6" />
          </div>
        </div>
      </div>

      {/* 컨트롤 바: 검색, 필터, 신규 등록 버튼 */}
      <div className="bg-card border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="작업자 이름 검색..."
              className="w-full text-sm pl-9 pr-3 py-2 bg-background border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex items-center bg-muted/60 p-1 rounded-xl border">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === filter
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter === 'ALL' ? '전체' : filter === 'ACTIVE' ? '활성' : '비활성'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="size-4" />
          <span>새 작업자 등록</span>
        </button>
      </div>

      {/* 작업자 목록 테이블 */}
      <div className="bg-card border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">작업자명</th>
                <th className="py-3 px-4">권한 (Role)</th>
                <th className="py-3 px-4">4자리 PIN</th>
                <th className="py-3 px-4">현장 로그인 상태</th>
                <th className="py-3 px-4">등록일시</th>
                <th className="py-3 px-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm font-medium">
                    등록된 작업자가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((op) => {
                  const isVisible = visiblePins[op.id] || false;
                  return (
                    <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-black">
                          {op.role === 'ADMIN' ? '🔑' : '👷'}
                        </div>
                        <div>
                          <div className="font-extrabold">{op.name}</div>
                          {op.name === '관리자' && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              기본 마스터 계정
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                            op.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {op.role === 'ADMIN' ? <ShieldCheck className="size-3" /> : null}
                          {op.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-widest text-base">
                            {isVisible ? op.pin_code : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(op.id)}
                            title={isVisible ? 'PIN 숨기기' : 'PIN 보기'}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(op)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            op.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span className={`size-2 rounded-full ${op.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{op.is_active ? '활성 (로그인 가능)' : '정지 (로그인 차단)'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(op.created_at).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPinTarget(op);
                              setNewPin('');
                              setPinError(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border text-xs font-bold hover:bg-muted transition-colors flex items-center gap-1"
                          >
                            <KeyRound className="size-3.5 text-primary" />
                            <span>PIN 재설정</span>
                          </button>

                          {op.name !== '관리자' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(op)}
                              className="p-1.5 rounded-lg border border-transparent text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="작업자 삭제"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 신규 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground w-full max-w-sm rounded-3xl p-5 shadow-2xl border animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">WMS-G Auth</span>
                <h3 className="text-lg font-black">새 작업자 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">
                  작업자 이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full text-sm p-2.5 bg-background border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  4자리 PIN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-sm p-2.5 bg-background border rounded-xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">권한 구분</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateRole('OPERATOR')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      createRole === 'OPERATOR'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    👷 OPERATOR (일반)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateRole('ADMIN')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      createRole === 'ADMIN'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    🔑 ADMIN (관리자)
                  </button>
                </div>
              </div>

              {createError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-200 rounded-xl font-bold text-xs">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="py-2.5 px-3 rounded-xl bg-muted text-muted-foreground font-bold text-xs hover:bg-muted/80 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow-xs hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {createLoading ? '등록 중...' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN 재설정 모달 */}
      {pinTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground w-full max-w-sm rounded-3xl p-5 shadow-2xl border animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">PIN Reset</span>
                <h3 className="text-lg font-black">PIN 재설정</h3>
              </div>
              <button
                type="button"
                onClick={() => setPinTarget(null)}
                className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPin} className="space-y-3.5">
              <div className="p-3 bg-muted/60 rounded-xl border text-xs">
                <span className="text-muted-foreground">대상 작업자: </span>
                <span className="font-extrabold font-mono text-foreground">{pinTarget.name} ({pinTarget.role})</span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  새 4자리 PIN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-sm p-2.5 bg-background border rounded-xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  * 재설정한 4자리 PIN으로 현장에서 즉시 로그인할 수 있습니다.
                </p>
              </div>

              {pinError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-200 rounded-xl font-bold text-xs">
                  {pinError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinTarget(null)}
                  disabled={pinLoading}
                  className="py-2.5 px-3 rounded-xl bg-muted text-muted-foreground font-bold text-xs hover:bg-muted/80 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow-xs hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {pinLoading ? '변경 중...' : 'PIN 변경 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
