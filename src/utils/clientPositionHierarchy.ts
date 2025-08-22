/**
 * Client Position Hierarchy Utilities
 * Helper functions for working with hierarchical client positions
 */

import type { ClientPositionType } from '../lib/supabase/types';

// Hierarchy levels mapping (for visual indentation)
export const HIERARCHY_LEVELS: Record<ClientPositionType, number> = {
  article: 1,
  section: 2,
  subsection: 3,
  header: 4,
  subheader: 5,
  executable: 6,
};

// Visual indentation mapping (in pixels)
export const VISUAL_INDENTS: Record<number, number> = {
  1: 0,   // article
  2: 20,  // section
  3: 40,  // subsection
  4: 60,  // header
  5: 80,  // subheader
  6: 100, // executable
};

// Icons for each position type
export const POSITION_ICONS: Record<ClientPositionType, string> = {
  article: '📚',
  section: '📂',
  subsection: '📁',
  header: '📄',
  subheader: '📝',
  executable: '✅',
};

// Type labels in Russian
export const POSITION_LABELS: Record<ClientPositionType, string> = {
  article: 'Статья',
  section: 'Раздел',
  subsection: 'Подраздел',
  header: 'Заголовок',
  subheader: 'Подзаголовок',
  executable: 'Исполняемая позиция',
};

// Check if position can contain BOQ items (works/materials)
export function canContainBOQItems(positionType: ClientPositionType): boolean {
  return positionType === 'executable';
}

// Get visual indent for position type
export function getVisualIndent(positionType: ClientPositionType): number {
  const level = HIERARCHY_LEVELS[positionType];
  return VISUAL_INDENTS[level] || 0;
}

// Get visual indent by hierarchy level
export function getIndentByLevel(level: number): number {
  return VISUAL_INDENTS[level] || 0;
}

// Get CSS class for position type
export function getPositionCSSClass(positionType: ClientPositionType): string {
  return `position-${positionType}`;
}

// Get next valid hierarchy level when some levels are skipped
export function getNextValidLevel(
  currentType: ClientPositionType, 
  availableTypes: Set<ClientPositionType>
): ClientPositionType {
  const hierarchy: ClientPositionType[] = ['article', 'section', 'subsection', 'header', 'subheader', 'executable'];
  const currentIndex = hierarchy.indexOf(currentType);
  
  // Find next available level down the hierarchy
  for (let i = currentIndex + 1; i < hierarchy.length; i++) {
    if (availableTypes.has(hierarchy[i])) {
      return hierarchy[i];
    }
  }
  
  // Default to executable if nothing found
  return 'executable';
}

// Get minimal color scheme for position type - focus on borders only
export function getPositionColors(positionType: ClientPositionType): {
  background: string;
  border: string;
  text: string;
} {
  const colorSchemes = {
    // Structural elements: subtle left border accent + clean white background
    article: {
      background: '#ffffff',
      border: '#3b82f6',     // Blue accent
      text: '#1f2937',
    },
    section: {
      background: '#ffffff',
      border: '#60a5fa',     // Light blue accent
      text: '#1f2937',
    },
    subsection: {
      background: '#ffffff',
      border: '#93c5fd',     // Lighter blue accent
      text: '#1f2937',
    },
    header: {
      background: '#ffffff',
      border: '#d1d5db',     // Gray accent
      text: '#1f2937',
    },
    subheader: {
      background: '#ffffff',
      border: '#e5e7eb',     // Light gray accent
      text: '#1f2937',
    },
    // Executable: emphasis with subtle green accent
    executable: {
      background: '#ffffff',
      border: '#10b981',     // Green accent for working items
      text: '#1f2937',
    },
  };

  return colorSchemes[positionType];
}

// Check if position is structural (non-executable)
export function isStructuralPosition(positionType: ClientPositionType): boolean {
  return positionType !== 'executable';
}

// Get font weight for position type - enhanced hierarchy
export function getFontWeight(positionType: ClientPositionType): 'normal' | 'medium' | 'semibold' | 'bold' {
  const weights = {
    article: 'bold' as const,      // Highest level - bold
    section: 'bold' as const,      // Major sections - bold  
    subsection: 'semibold' as const, // Sub-sections - semibold
    header: 'semibold' as const,   // Headers - semibold (upgraded from medium)
    subheader: 'medium' as const,  // Subheaders - medium (upgraded from normal)
    executable: 'medium' as const, // Working items - medium emphasis (upgraded from normal)
  };

  return weights[positionType];
}

// Get text size for position type - adds another hierarchy layer
export function getTextSize(positionType: ClientPositionType): string {
  const sizes = {
    article: 'text-lg',      // 18px - largest for top level
    section: 'text-base',    // 16px - standard large
    subsection: 'text-base', // 16px - standard 
    header: 'text-sm',       // 14px - smaller headers
    subheader: 'text-sm',    // 14px - small headers
    executable: 'text-base', // 16px - readable for work items
  };

  return sizes[positionType];
}

// Get tag color for position type - matches the border accent colors
export function getTagColor(positionType: ClientPositionType): string {
  const colors = {
    article: 'blue',       // Matches blue accent
    section: 'blue',       // Matches blue accent  
    subsection: 'blue',    // Matches blue accent
    header: 'default',     // Gray for headers
    subheader: 'default',  // Gray for subheaders
    executable: 'success', // Green for executable items
  };

  return colors[positionType];
}