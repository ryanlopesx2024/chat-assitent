import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E2C074',
      light: '#E8D4A4',
      dark: '#C4A05C'
    },
    secondary: {
      main: '#1E1E1E',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E'
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)'
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#FFFFFF'
    },
    h5: {
      fontWeight: 600,
      color: '#FFFFFF'
    },
    h6: {
      fontWeight: 600,
      color: '#FFFFFF'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1E1E1E'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1E1E1E'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#2D2D2D',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)'
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#E2C074'
            }
          },
          '& .MuiInputBase-input': {
            color: '#FFFFFF'
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    }
  }
});
