export type StudioNodeType = 'RACK' | 'STAGING' | 'COLD_ZONE' | 'DOCK' | 'OBSTACLE' | 'AISLE'
export type StudioTemperatureZone = 'ROOM' | 'CHILLED' | 'FROZEN'

export interface StudioNode {
  id: string
  type: StudioNodeType
  label: string
  x: number // grid units (e.g., 0 to 60)
  y: number // grid units (e.g., 0 to 40)
  width: number // grid units
  height: number // grid units
  rotation?: number // 0, 90, 180, 270
  zone: string // e.g., 'A', 'F', 'S', 'DOCK'
  rackPrefix?: string // e.g., 'A01', 'F01', 'S01'
  bays?: number // default 10
  levels?: number // 1 to 5 (A, B, C, D, E), default 2
  bins?: number // 1 to 4 (01, 02...), default 2
  temperature: StudioTemperatureZone
  color?: string
  notes?: string
}

export interface StudioViewport {
  zoom: number
  panX: number
  panY: number
}

export interface WarehouseStudioLayoutData {
  viewport: StudioViewport
  nodes: StudioNode[]
}

export interface WarehouseLayoutRecord {
  id: string
  tenant_id: string
  warehouse_name: string
  grid_width: number
  grid_height: number
  layout_data: WarehouseStudioLayoutData
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GeneratedLocationItem {
  code: string
  zone_type: 'A' | 'F'
  pos_x: number
  pos_y: number
  rotation: number
  temperature_zone: StudioTemperatureZone
  tenant_id?: string
}

const LEVEL_LETTERS = ['A', 'B', 'C', 'D', 'E']

/**
 * 2D 캔버스에 배치된 랙/스테이징 노드로부터 표준 규격 로케이션 코드 일괄 생성
 * 규격: LOC-{ZONE}{AISLE:02}{BAY:02}{LEVEL}{BIN:02}
 * 예시: LOC-A0105B01, LOC-S0101A01
 */
export function generateLocationsFromNodes(nodes: StudioNode[]): GeneratedLocationItem[] {
  const pad = (n: number) => String(n).padStart(2, '0')
  const results: GeneratedLocationItem[] = []

  const rackNodes = nodes.filter(
    (n) => n.type === 'RACK' || n.type === 'STAGING' || n.type === 'COLD_ZONE'
  )

  for (const node of rackNodes) {
    const rawZone = (node.zone || 'A').toUpperCase()
    // DB enum is ('A', 'F'), Zone S or others default to 'A'
    const zoneType: 'A' | 'F' = rawZone === 'F' ? 'F' : 'A'
    const aislePrefix = node.rackPrefix ? node.rackPrefix.replace(/^[A-Z]/, '') : '01'
    const aisleNum = parseInt(aislePrefix, 10) || 1

    const totalBays = Math.max(1, node.bays || 1)
    const totalLevels = Math.min(5, Math.max(1, node.levels || 1))
    const totalBins = Math.min(4, Math.max(1, node.bins || 1))

    const validLevels = LEVEL_LETTERS.slice(0, totalLevels)

    for (let bay = 1; bay <= totalBays; bay++) {
      for (const level of validLevels) {
        for (let bin = 1; bin <= totalBins; bin++) {
          const code = `LOC-${rawZone}${pad(aisleNum)}${pad(bay)}${level}${pad(bin)}`
          
          // 각 베이(Bay)별 그리드 좌표 세분화 계산
          const bayOffsetX = (node.width / totalBays) * (bay - 1)
          const posX = Number((node.x + bayOffsetX).toFixed(2))
          const posY = Number(node.y.toFixed(2))

          results.push({
            code,
            zone_type: zoneType,
            pos_x: posX,
            pos_y: posY,
            rotation: node.rotation || 0,
            temperature_zone: node.temperature || (rawZone === 'F' ? 'FROZEN' : 'ROOM'),
          })
        }
      }
    }
  }

  return results
}
