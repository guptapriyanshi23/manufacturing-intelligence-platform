import React, { useEffect, useMemo, useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';

// Levels in order; sensor, enterprise, and site are excluded (handled separately/externally)
const LEVEL_ORDER: NodeType[] = ['area', 'line', 'station', 'asset', 'component'];
const MANDATORY_UP_TO: NodeType = 'asset';
const DEFAULT_LEVELS: NodeType[] = ['area', 'asset'];

function getLevelLabel(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    enterprise: 'Enterprise',
    site: 'Site',
    area: 'Area',
    line: 'Line',
    station: 'Station',
    asset: 'Asset',
    component: 'Component',
    sensor: 'Sensor',
  };
  return labels[type] ?? type;
}

export interface HierarchySelectorProps {
  flatNodes: HierarchyNode[];
  /** Called whenever the selected node changes at any level */
  onSelectionChange: (selectedNode: HierarchyNode | null, isComplete: boolean) => void;
  /** Optionally pre-select a node by id */
  initialNodeId?: number | null;
  /** Disables all dropdowns while hierarchy data is loading */
  loading?: boolean;
  /** Selected Site ID from the page header */
  selectedSiteId?: number | '';
}

export const HierarchySelector: React.FC<HierarchySelectorProps> = ({
  flatNodes,
  onSelectionChange,
  initialNodeId,
  loading = false,
  selectedSiteId = '',
}) => {
  // selections[i] = selected node id at level i (or '')
  const [selections, setSelections] = useState<(number | '')[]>([]);

  // Derive the levels that actually exist in the data; fall back to defaults while loading
  const presentLevels = useMemo(() => {
    const types = new Set(flatNodes.map(n => n.node_type));
    const detected = LEVEL_ORDER.filter(l => types.has(l));
    return detected.length > 0 ? detected : DEFAULT_LEVELS;
  }, [flatNodes]);

  // Track previous selectedSiteId to prevent clearing pre-selection on first mount
  const prevSiteIdRef = React.useRef<number | '' | null>(null);

  // Initialize/reset selections when selectedSiteId changes
  useEffect(() => {
    if (prevSiteIdRef.current !== null && prevSiteIdRef.current !== selectedSiteId) {
      setSelections(new Array(presentLevels.length).fill(''));
      onSelectionChange(null, false);
    }
    prevSiteIdRef.current = selectedSiteId;
  }, [selectedSiteId, presentLevels.length]);

  // Pre-select initialNodeId by walking up the ancestor chain
  useEffect(() => {
    if (!initialNodeId || flatNodes.length === 0 || presentLevels.length === 0) return;
    const node = flatNodes.find(n => n.id === initialNodeId);
    if (!node) return;

    // Build ancestor chain from root → node
    const chain: HierarchyNode[] = [];
    let current: HierarchyNode | undefined = node;
    while (current) {
      chain.unshift(current);
      current = current.parent_id ? flatNodes.find(n => n.id === current!.parent_id) : undefined;
    }

    const newSelections = new Array(presentLevels.length).fill('');
    chain.forEach(n => {
      const idx = presentLevels.indexOf(n.node_type);
      if (idx !== -1) newSelections[idx] = n.id;
    });
    setSelections(newSelections);

    const mandatoryIdx = presentLevels.indexOf(MANDATORY_UP_TO);
    const isComplete = mandatoryIdx === -1
      ? true
      : newSelections.slice(0, mandatoryIdx + 1).every(s => s !== '');
    onSelectionChange(node, isComplete);
  }, [initialNodeId, flatNodes, presentLevels]);

  // Get children of the node selected at level i-1 (or root area nodes if i=0)
  const getOptionsForLevel = (levelIndex: number): HierarchyNode[] => {
    if (levelIndex === 0) {
      if (!selectedSiteId) return [];
      return flatNodes.filter(n => n.parent_id === selectedSiteId && n.node_type === presentLevels[0]);
    }
    const parentId = selections[levelIndex - 1];
    if (!parentId) return [];
    const levelType = presentLevels[levelIndex];
    return flatNodes.filter(n => n.parent_id === parentId && n.node_type === levelType);
  };

  const handleChange = (levelIndex: number, value: number | '') => {
    const newSelections = [...selections.slice(0, levelIndex), value, ...new Array(presentLevels.length - levelIndex - 1).fill('')];
    setSelections(newSelections);

    let lastSelectedId: number | '' = '';
    for (let j = newSelections.length - 1; j >= 0; j--) {
      if (newSelections[j] !== '') {
        lastSelectedId = newSelections[j];
        break;
      }
    }
    const selectedNode = lastSelectedId ? flatNodes.find(n => n.id === lastSelectedId) ?? null : null;

    const mandatoryIdx = presentLevels.indexOf(MANDATORY_UP_TO);
    const isComplete = mandatoryIdx === -1
      ? !!lastSelectedId
      : newSelections.slice(0, mandatoryIdx + 1).every(s => s !== '');

    onSelectionChange(selectedNode, isComplete);
  };

  const mandatoryIdx = presentLevels.indexOf(MANDATORY_UP_TO);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%' }}>
      {presentLevels.map((level, i) => {
        const options = getOptionsForLevel(i);
        const isMandatory = mandatoryIdx === -1 || i <= mandatoryIdx;
        const isDisabled = loading || (i > 0 && !selections[i - 1]);

        return (
          <FormControl
            key={level}
            size="small"
            sx={{ flex: 1, minWidth: 0 }}
            disabled={isDisabled}
            required={isMandatory}
          >
            <InputLabel>
              {getLevelLabel(level)}
            </InputLabel>
            <Select
              value={selections[i] ?? ''}
              label={getLevelLabel(level)}
              onChange={(e) => handleChange(i, e.target.value as number | '')}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {options.map(n => (
                <MenuItem key={n.id} value={n.id}>{n.display_name}</MenuItem>
              ))}
              {options.length === 0 && (
                <MenuItem disabled value=""><em>No options</em></MenuItem>
              )}
            </Select>
          </FormControl>
        );
      })}
    </Box>
  );
};

export default HierarchySelector;
