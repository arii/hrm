import React from 'react'
import Table from '@mui/material/Table'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { styled } from '@mui/material/styles'
import { WorkoutTableDto } from '@/types/workout'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.common.black,
    fontWeight: 'bold',
    fontSize: '1.4rem', // Large header font
    border: `1px solid ${theme.palette.divider}`,
  },
}))

interface WorkoutTableViewerProps {
  data: WorkoutTableDto
}

const WorkoutTableViewer: React.FC<WorkoutTableViewerProps> = ({ data }) => {
  return (
    <TableContainer
      component={Paper}
      elevation={3}
      sx={{ borderRadius: 2 }}
      data-testid="workout-table-viewer"
    >
      <Table sx={{ borderCollapse: 'collapse' }} aria-label="workout details">
        <TableHead>
          <TableRow>
            {data.headers.map((header, index) => (
              <StyledTableCell key={index} scope="col">
                {header}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
      </Table>
    </TableContainer>
  )
}

export default WorkoutTableViewer
