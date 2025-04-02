import { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

const GlobeViewer = ({ data, title, height = '70vh' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const globeRef = useRef(null);

  useEffect(() => {
    if (globeRef.current) {
      // Auto-rotate the globe
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      
      // Set initial camera position
      globeRef.current.pointOfView({
        lat: 0,
        lng: 0,
        altitude: 2.5
      });
    }
  }, []);

  useEffect(() => {
    try {
      if (data) {
        setLoading(false);
      }
    } catch (err) {
      setError('Error processing globe data');
      setLoading(false);
    }
  }, [data]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading globe...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2, height }}>
      <Box sx={{ height: '100%', position: 'relative' }}>
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={data.points}
          pointAltitude={0.01}
          pointColor="color"
          pointRadius="size"
          pointLabel="label"
          arcsData={data.arcs}
          arcColor="color"
          arcAltitude={0.1}
          arcStroke={1}
          atmosphereColor="#3a228a"
          atmosphereAltitude={0.1}
          rendererConfig={{ antialias: true }}
        />
      </Box>
    </Paper>
  );
};

export default GlobeViewer; 