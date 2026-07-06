import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box
} from '@mui/material';

interface Column<T> {
  id: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  title,
  columns,
  data,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none',  borderRadius: 1, border: '1px solid #000000' ,}}>
      {title && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      )}
      <Table sx={{ minWidth: 650 }} aria-label="data table">
        <TableHead sx={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.id} sx={{ fontWeight: 600, borderColor: '#000000' }}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 3, borderColor: '#000000' }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                {columns.map((col) => (
                  <TableCell key={col.id} sx={{ borderColor: '#000000' }}>
                    {col.render ? col.render(row) : (row as any)[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
