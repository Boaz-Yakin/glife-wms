import { createClient } from '@/lib/supabase/server';
import type { WarehouseOperator, CreateOperatorInput } from '@/types/operator';

export class OperatorService {
  /**
   * 전체 작업자 목록 조회
   */
  static async getOperators(): Promise<{ data: WarehouseOperator[]; error: string | null }> {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from('warehouse_operators')
        .select('*')
        .order('role', { ascending: true }) // ADMIN first
        .order('name', { ascending: true });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data || []) as WarehouseOperator[], error: null };
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * 신규 작업자 생성
   */
  static async createOperator(input: CreateOperatorInput): Promise<{ data: WarehouseOperator | null; error: string | null }> {
    try {
      const cleanName = input.name.trim();
      const cleanPin = input.pin_code.trim();

      if (!cleanName) {
        return { data: null, error: '작업자 이름을 입력해주세요.' };
      }
      if (!/^\d{4}$/.test(cleanPin)) {
        return { data: null, error: 'PIN은 4자리 숫자여야 합니다.' };
      }

      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from('warehouse_operators')
        .insert({
          name: cleanName,
          pin_code: cleanPin,
          role: input.role || 'OPERATOR',
          is_active: true,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: '이미 동일한 이름의 작업자가 존재합니다.' };
        }
        return { data: null, error: error.message };
      }

      return { data: data as WarehouseOperator, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : '작업자 생성 실패' };
    }
  }

  /**
   * 작업자 PIN 번호 재설정
   */
  static async updateOperatorPin(operatorId: string, newPin: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const cleanPin = newPin.trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        return { success: false, error: 'PIN은 4자리 숫자여야 합니다.' };
      }

      const supabase = await createClient();
      const { error } = await (supabase as any)
        .from('warehouse_operators')
        .update({
          pin_code: cleanPin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', operatorId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'PIN 변경 실패' };
    }
  }

  /**
   * 작업자 활성 상태 토글 (재직 / 퇴사)
   */
  static async toggleOperatorActive(operatorId: string, isActive: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();
      const { error } = await (supabase as any)
        .from('warehouse_operators')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', operatorId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : '상태 변경 실패' };
    }
  }

  /**
   * 작업자 삭제 (관리자 계정 보호)
   */
  static async deleteOperator(operatorId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // 관리자 본인 삭제 방지
      const { data: target } = await (supabase as any)
        .from('warehouse_operators')
        .select('name, role')
        .eq('id', operatorId)
        .single();

      if (target && target.name === '관리자') {
        return { success: false, error: '기본 관리자 계정은 삭제할 수 없습니다.' };
      }

      const { error } = await (supabase as any)
        .from('warehouse_operators')
        .delete()
        .eq('id', operatorId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : '작업자 삭제 실패' };
    }
  }
}
