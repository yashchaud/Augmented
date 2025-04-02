import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography, 
  Divider,
  useMediaQuery,
  useTheme,
  Avatar,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Videocam as VideoIcon,
  PictureAsPdf as PdfIcon,
  Mic as MicIcon,
  ViewInAr as WebGLIcon,
  Audiotrack as AudiotrackIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const Navigation = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    const currentPath = location.pathname;
    const matchingItem = menuItems.find(item => item.path === currentPath);
    setCurrentSection(matchingItem?.text || 'Media App');
  }, [location.pathname]);

  const menuItems = [
    { text: 'Video Streaming', path: '/video', icon: <VideoIcon /> },
    { text: 'PDF Viewer', path: '/pdf', icon: <PdfIcon /> },
    { text: 'Audio Recorder', path: '/audio-recorder', icon: <MicIcon /> },
    { text: 'WebGL Player', path: '/webgl', icon: <WebGLIcon /> },
    { text: 'Audio Review', path: '/audio-review', icon: <AudiotrackIcon /> },
  ];

  const drawer = (
    <div>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'primary.main',
        color: 'white'
      }}>
        <Avatar 
          sx={{ 
            width: 60, 
            height: 60, 
            mb: 1,
            backgroundColor: 'white',
            color: 'primary.main',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          MA
        </Avatar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Media App
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Interactive Media Platform
        </Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ py: 2 }}>
        <List>
          {menuItems.map((item) => {
            const isSelected = location.pathname === item.path;
            
            return (
              <ListItem 
                component={Link} 
                to={item.path} 
                key={item.text}
                onClick={isMobile ? handleDrawerToggle : undefined}
                sx={{
                  borderRadius: '0 24px 24px 0',
                  mr: 2,
                  mb: 0.5,
                  position: 'relative',
                  color: isSelected ? 'primary.main' : 'text.primary',
                  backgroundColor: isSelected 
                    ? alpha(theme.palette.primary.main, 0.08)
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isSelected 
                      ? alpha(theme.palette.primary.main, 0.12)
                      : alpha(theme.palette.primary.main, 0.04),
                  },
                  '&::before': isSelected ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    height: '60%',
                    width: 4,
                    backgroundColor: 'primary.main',
                    borderRadius: '0 4px 4px 0'
                  } : {}
                }}
              >
                <ListItemIcon sx={{ 
                  color: isSelected ? 'primary.main' : 'text.secondary',
                  minWidth: 40
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '0.95rem'
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          Media App v1.0.0
        </Typography>
      </Box>
    </div>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 10px rgba(0,0,0,0.05)',
        }}
        elevation={0}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
              {currentSection}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Add app controls/user menu here if needed */}
            <Tooltip title="App Settings">
              <Avatar 
                sx={{ 
                  width: 35, 
                  height: 35, 
                  cursor: 'pointer', 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main'
                }}
              >
                MA
              </Avatar>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={isMobile ? handleDrawerToggle : undefined}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
              boxShadow: isMobile ? '0 8px 24px rgba(0,0,0,0.1)' : 'none',
            },
            '& .MuiBackdrop-root': {
              backgroundColor: alpha(theme.palette.common.black, 0.5),
              backdropFilter: 'blur(3px)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </>
  );
};

export default Navigation; 