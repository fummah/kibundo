import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, Paper, Typography, Box } from '@mui/material';
import api from '@/api/axios';
import { toast } from 'react-toastify';

const AgentForm = () => {
  const [formData, setFormData] = useState({
    agent_name: '',
    entities: '',
    grade: '',
    state: 'draft',
    file_name: '',
    api: ''
  });
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    // Fetch grades if needed
    const fetchGrades = async () => {
      try {
        const response = await api.get('/allclasses');
        const gradesList = Array.isArray(response.data) ? response.data : [];
        setGrades(gradesList.map(g => ({
          id: g.id,
          name: g.name || g.class_name || `Grade ${g.id}`
        })));
      } catch (error) {
        console.error('Error fetching grades:', error);
        toast.error('Failed to load grades');
      }
    };

    fetchGrades();

    // If editing, fetch agent data
    if (id) {
      const fetchAgent = async () => {
        try {
          const response = await api.get(`/agents/${id}`);
          setFormData({
            agent_name: response.data.name,
            entities: response.data.entities,
            grade: response.data.grade,
            state: response.data.state || 'draft',
            file_name: response.data.file_name || '',
            api: response.data.api || ''
          });
        } catch (error) {
          console.error('Error fetching agent:', error);
          toast.error('Failed to load agent data');
        }
      };
      fetchAgent();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const agentData = {
        agent_name: formData.agent_name,
        entities: formData.entities,
        grade: formData.grade,
        state: formData.state || 'draft',
        file_name: formData.file_name || '',
        api: formData.api || ''
      };

      console.log('Submitting agent data:', agentData);
      
      let response;
      if (id) {
        response = await api.put(`/agents/${id}`, agentData);
        console.log('Update response:', response);
        toast.success('Agent updated successfully');
      } else {
        response = await api.post('/addagent', agentData);
        console.log('Create response:', response);
        if (response && response.data) {
          console.log('Response data:', response.data);
        }
        toast.success('Agent created successfully');
      }
      
      // Wait a moment before navigating to ensure the toast is visible
      setTimeout(() => {
        navigate('/admin/academics/kibundo');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving agent:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to save agent';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        {id ? 'Edit' : 'Create New'} AI Agent
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Agent Name"
              name="agent_name"
              value={formData.agent_name}
              onChange={handleChange}
              required
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Grade</InputLabel>
              <Select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                label="Grade"
                required
              >
                {grades.map((grade) => (
                  <MenuItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Entities (comma separated)"
              name="entities"
              value={formData.entities}
              onChange={handleChange}
              required
              margin="normal"
              helperText="Enter entities separated by commas"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="File Name (Optional)"
              name="file_name"
              value={formData.file_name}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="API Endpoint (Optional)"
              name="api"
              value={formData.api}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/admin/academics/kibundo')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Agent'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default AgentForm;
