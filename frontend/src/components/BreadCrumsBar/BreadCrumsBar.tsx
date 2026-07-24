import React, { useEffect, useState } from 'react';
// import { Box, Breadcrumbs, Typography } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import '../../pages/Alerts/Alerts.scss'
import { fmtDate, fmtTime } from '../../constants/datetimefmt';


interface BreadCrumbsProps {
    breadcrumbsData: string[]
}

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
);
const ClockIcon = () => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>
);

const BreadCrumsBar: React.FC<BreadCrumbsProps> = ({ breadcrumbsData }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="breadcrumb-bar">
            <div className="breadcrumb-bar__crumbs">
                {breadcrumbsData?.length === 0 ? (
                    <span className='breadcrumb-bar__item'>...</span>
                ) : <>
                {breadcrumbsData?.map((crumb, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="breadcrumb-bar__sep"><NavigateNextIcon fontSize="small" /></span>}
                        <span className={i === breadcrumbsData?.length - 1 ? 'breadcrumb-bar__item breadcrumb-bar__item--active' : 'breadcrumb-bar__item'}>
                            {crumb}
                        </span>
                    </React.Fragment>
                ))}
            </>}
            </div>
            <div className="breadcrumb-bar__datetime">
                <CalendarIcon />
                <span>{fmtDate(currentTime)}</span>
                <span className="breadcrumb-bar__time-sep">|</span>
                <ClockIcon />
                <span>{fmtTime(currentTime)}</span>
            </div>
        </div>
    );
};

export default BreadCrumsBar;
