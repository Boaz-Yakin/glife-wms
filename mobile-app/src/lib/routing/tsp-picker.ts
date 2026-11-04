/**
 * 2D Spatial TSP Picking Route Optimization Engine
 * 
 * Features:
 * 1. Cold Chain Integrity: Strict separation of ROOM -> CHILLED -> FROZEN picking order.
 * 2. 2D Metric Space: Utilizes pos_x and pos_y (meters) from the visual warehouse studio.
 * 3. TSP Solver: Nearest Neighbor heuristic followed by 2-Opt path uncrossing.
 * 4. S-Shape Fallback: Gracefully falls back to standard Aisle/Bay snake routing if coordinates are 0.
 * 5. Turn-by-Turn Navigation: Computes relative bearing, distance, and direction arrows.
 */

export interface LocationPoint {
  id: string;
  code: string;
  x: number;
  y: number;
  zone?: string;
  temperature_zone?: string;
  aisle?: number;
  bay?: number;
  level?: string;
  bin?: number;
}

export type NavDirection = 'FORWARD' | 'RIGHT' | 'LEFT' | 'BACKWARD' | 'ARRIVED';

export interface NavGuide {
  direction: NavDirection;
  label: string; // e.g. "전방 4.5m", "우측 6.0m"
  distanceMeters: number;
  arrowIcon: '↑' | '→' | '←' | '↓' | '✓';
  targetCode: string;
}

/**
 * Standard Cold Chain priority order:
 * 1. ROOM / DRY (상온)
 * 2. CHILLED (냉장)
 * 3. FROZEN (냉동)
 */
export function getTemperatureRank(tempZone?: string | null): number {
  if (!tempZone) return 1;
  const upper = tempZone.toUpperCase();
  if (upper.includes('ROOM') || upper === 'A' || upper.includes('DRY')) return 1;
  if (upper.includes('CHILLED') || upper.includes('COOL') || upper === 'C') return 2;
  if (upper.includes('FROZEN') || upper === 'F') return 3;
  return 1;
}

/**
 * 2D Euclidean distance in meters
 */
export function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Solve TSP using Nearest Neighbor + 2-Opt Optimization for a single zone cluster
 */
function solveClusterTSP<T extends { locations?: { pos_x?: number | null; pos_y?: number | null; code?: string; aisle?: number; bay?: number } | null }>(
  items: T[],
  startPoint: { x: number; y: number }
): T[] {
  if (items.length <= 2) return items;

  // Extract coordinates
  const nodes = items.map((item, idx) => {
    const loc = item.locations;
    const x = typeof loc?.pos_x === 'number' ? loc.pos_x : 0;
    const y = typeof loc?.pos_y === 'number' ? loc.pos_y : 0;
    return { idx, x, y, item, hasCoords: x !== 0 || y !== 0 };
  });

  // If no items have 2D coordinates, fallback to S-Shape Aisle/Bay sorting
  const hasValidCoords = nodes.some((n) => n.hasCoords);
  if (!hasValidCoords) {
    return [...items].sort((a, b) => {
      const locA = a.locations;
      const locB = b.locations;
      if (!locA || !locB) return 0;
      if ((locA.aisle || 0) !== (locB.aisle || 0)) return (locA.aisle || 0) - (locB.aisle || 0);
      const isOdd = (locA.aisle || 0) % 2 !== 0;
      return isOdd ? (locA.bay || 0) - (locB.bay || 0) : (locB.bay || 0) - (locA.bay || 0);
    });
  }

  // 1. Nearest Neighbor construction
  const unvisited = [...nodes];
  const tour: typeof nodes = [];
  let currentPos = startPoint;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = getDistance(currentPos, unvisited[i]);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }

    const nextNode = unvisited.splice(nearestIdx, 1)[0];
    tour.push(nextNode);
    currentPos = nextNode;
  }

  // 2. 2-Opt optimization (uncross overlapping legs)
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < tour.length - 1; i++) {
      for (let j = i + 1; j < tour.length; j++) {
        const pA = i === 0 ? startPoint : tour[i - 1];
        const pB = tour[i];
        const pC = tour[j];
        const pD = j + 1 < tour.length ? tour[j + 1] : null;

        const currentDist = getDistance(pA, pB) + (pD ? getDistance(pC, pD) : 0);
        const newDist = getDistance(pA, pC) + (pD ? getDistance(pB, pD) : 0);

        if (newDist + 0.001 < currentDist) {
          // Reverse segment from i to j
          const segment = tour.slice(i, j + 1).reverse();
          tour.splice(i, segment.length, ...segment);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return tour.map((node) => node.item);
}

/**
 * Top-level route optimizer:
 * 1. Groups by Temperature Zone (Cold Chain Gate)
 * 2. Solves TSP on each cluster
 * 3. Merges into globally optimized tour
 */
export function optimizePickingTour<T extends { locations?: { pos_x?: number | null; pos_y?: number | null; temperature_zone?: string | null; code?: string; aisle?: number; bay?: number } | null }>(
  items: T[],
  dockStart = { x: 0, y: 0 }
): { sortedItems: T[]; totalDistanceMeters: number } {
  if (items.length <= 1) {
    return { sortedItems: items, totalDistanceMeters: 0 };
  }

  // Group by temperature zone rank
  const groups = new Map<number, T[]>();

  for (const item of items) {
    const rank = getTemperatureRank(item.locations?.temperature_zone);
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank)!.push(item);
  }

  // Sort ranks ascending (1: ROOM -> 2: CHILLED -> 3: FROZEN)
  const sortedRanks = Array.from(groups.keys()).sort((a, b) => a - b);

  let currentHead = dockStart;
  const finalTour: T[] = [];
  let totalDistance = 0;

  for (const rank of sortedRanks) {
    const clusterItems = groups.get(rank)!;
    const optimizedCluster = solveClusterTSP(clusterItems, currentHead);

    for (const item of optimizedCluster) {
      finalTour.push(item);
      const loc = item.locations;
      const x = typeof loc?.pos_x === 'number' ? loc.pos_x : currentHead.x;
      const y = typeof loc?.pos_y === 'number' ? loc.pos_y : currentHead.y;
      totalDistance += getDistance(currentHead, { x, y });
      currentHead = { x, y };
    }
  }

  return {
    sortedItems: finalTour,
    totalDistanceMeters: Math.round(totalDistance * 10) / 10,
  };
}

/**
 * Computes navigation direction and distance from current location to target location
 */
export function calculateNavGuide(
  current: { x: number; y: number } | null,
  target: { x: number; y: number; code?: string } | null
): NavGuide {
  if (!target) {
    return {
      direction: 'ARRIVED',
      label: '피킹 완료',
      distanceMeters: 0,
      arrowIcon: '✓',
      targetCode: '',
    };
  }

  const curr = current || { x: 0, y: 0 };
  const dx = target.x - curr.x;
  const dy = target.y - curr.y;
  const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10;

  if (distance < 0.5) {
    return {
      direction: 'ARRIVED',
      label: '현재 위치 도착',
      distanceMeters: distance,
      arrowIcon: '✓',
      targetCode: target.code || '',
    };
  }

  // Calculate angle in degrees relative to warehouse Y-axis (North/Forward)
  // Assuming positive Y is forward (into warehouse aisles), positive X is right
  const angleRad = Math.atan2(dx, dy);
  const angleDeg = (angleRad * 180) / Math.PI;

  let direction: NavDirection = 'FORWARD';
  let arrowIcon: NavGuide['arrowIcon'] = '↑';
  let directionText = '전방';

  if (angleDeg >= -30 && angleDeg <= 30) {
    direction = 'FORWARD';
    arrowIcon = '↑';
    directionText = '전방';
  } else if (angleDeg > 30 && angleDeg <= 120) {
    direction = 'RIGHT';
    arrowIcon = '→';
    directionText = '우측';
  } else if (angleDeg < -30 && angleDeg >= -120) {
    direction = 'LEFT';
    arrowIcon = '←';
    directionText = '좌측';
  } else {
    direction = 'BACKWARD';
    arrowIcon = '↓';
    directionText = '후방';
  }

  return {
    direction,
    label: `${directionText} ${distance}m`,
    distanceMeters: distance,
    arrowIcon,
    targetCode: target.code || '',
  };
}
