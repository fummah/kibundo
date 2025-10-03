import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  TablePagination,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

const AgentsList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await axios.delete(`/api/agents/${id}`);
        toast.success('Agent deleted successfully');
        fetchAgents();
      } catch (error) {
        console.error('Error deleting agent:', error);
        toast.error('Failed to delete agent');
      }
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredAgents = agents.filter(agent =>
    agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedAgents = filteredAgents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return <div>Loading agents...</div>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">AI Agents</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => navigate('/admin/academics/kibundo/new')}
        >
          New Agent
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search agents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Entities</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAgents.length > 0 ? (
              paginatedAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>{agent.agent_name}</TableCell>
                  <TableCell>{agent.grade}</TableCell>
                  <TableCell>
                    {agent.entities?.split(',').map((entity, i) => (
                      <Chip key={i} label={entity.trim()} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={agent.state || 'draft'}
                      color={agent.state === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/academics/kibundo/${agent.id}/edit`)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(agent.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No agents found. Create your first agent to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredAgents.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default AgentsList;
