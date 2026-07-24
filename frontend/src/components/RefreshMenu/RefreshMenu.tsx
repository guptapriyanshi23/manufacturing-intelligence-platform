import React, { useState, useEffect } from 'react';
import { Box, MenuItem, Button, ButtonGroup, Menu, Typography, } from '@mui/material';
import { useLocation } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { fmtFullTime } from '../../constants/datetimefmt';

export const REFRESH_INTERVALS = {
    'off': 0,
    '5s': 5000,
    '10s': 10000,
    '30s': 30000,
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '2h': 7200000,
    '1d': 86400000,
} as const;

export type RefreshInterval =
    keyof typeof REFRESH_INTERVALS;


interface RefreshMenuProps {
    lastRefreshTime: Date;
    setLastRefreshTime: React.Dispatch<React.SetStateAction<Date>>;
    refreshInterval: RefreshInterval;
    onIntervalChange: (value: RefreshInterval) => void;
    onRefresh: () => void;
}

export const RefreshMenu: React.FC<RefreshMenuProps> = ({ lastRefreshTime, setLastRefreshTime, refreshInterval,
    onIntervalChange, onRefresh }) => {
    const intervalMs = REFRESH_INTERVALS[refreshInterval];
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const location = useLocation();

    const pageKey = location.pathname === '/' ? 'alert' : location.pathname.replace(/\//g, '_');

    const refreshStorageKey = `refresh_interval_${pageKey}`;

    const nextRefreshAt = new Date(
        lastRefreshTime.getTime() + intervalMs
    );

    useEffect(() => {
        const storedValue = localStorage.getItem(refreshStorageKey);

        if (storedValue && storedValue in REFRESH_INTERVALS) {
            onIntervalChange(storedValue as RefreshInterval);
        }
    }, [refreshStorageKey]);

    useEffect(() => {
        localStorage.setItem(refreshStorageKey, refreshInterval);
    }, [refreshInterval, refreshStorageKey]);

    useEffect(() => {
        const intervalMs = REFRESH_INTERVALS[refreshInterval];

        if (intervalMs === 0) return;

        const timer = setInterval(() => {
            onRefresh();
            setLastRefreshTime(new Date());
        }, intervalMs);

        return () => clearInterval(timer);
    }, [refreshInterval, onRefresh, setLastRefreshTime]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, }}>
            {refreshInterval !== 'off' && (
                <Typography variant="caption" color="text.secondary">
                    Refreshing at: {fmtFullTime(nextRefreshAt)}
                </Typography>
            )}
            <ButtonGroup variant="outlined" color='secondary' size="small">
                <Button startIcon={<RefreshIcon />} onClick={() => { onRefresh(); setLastRefreshTime(new Date()); }}>
                    Refresh
                </Button>

                <Button onClick={(e) => setAnchorEl(e.currentTarget)}>
                    {refreshInterval}
                    <ArrowDropDownIcon />
                </Button>
            </ButtonGroup>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                {Object.keys(REFRESH_INTERVALS).map((interval) => (
                    <MenuItem key={interval} selected={interval === refreshInterval}
                        onClick={() => {
                            localStorage.setItem(refreshStorageKey, interval);
                            onIntervalChange(interval as RefreshInterval);
                            setAnchorEl(null);
                        }}>
                        {interval}
                    </MenuItem>
                ))}
            </Menu>

        </Box>
    );
};
