import { useState, useRef, useEffect } from 'react'
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Avatar,
  CircularProgress,
  Tooltip
} from '@mui/material'
import { 
  Send as SendIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  RestartAlt as RestartAltIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import OpenAI from 'openai';
import jsPDF from 'jspdf';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E2C074',
    },
    secondary: {
      main: '#1E1E1E',
    },
    background: {
      default: '#030409',
      paper: '#1A1C23',
    },
    text: {
      primary: '#ffffff',
      secondary: '#E2C074',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: '#E2C074',
            },
            '&:hover fieldset': {
              borderColor: '#E2C074',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#E2C074',
            },
          },
          '& .MuiInputBase-input': {
            color: '#ffffff',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
        },
        contained: {
          backgroundColor: '#E2C074',
          color: '#030409',
          '&:hover': {
            backgroundColor: '#c4a666',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2C074',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2C074',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2C074',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const GOOGLE_DOCS_API_URL = 'https://docs.googleapis.com/v1/documents';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Lista de assistentes disponíveis
const assistantTypes = {
  'Campanha de Google Ads': import.meta.env.VITE_ASSISTANT_CAMPAIGN_GOOGLE_ADS,
  'Landing Page Juridica': import.meta.env.VITE_ASSISTANT_LANDING_PAGE_JURIDICA,
  'Modelos de Documentos Extrajudiciais': import.meta.env.VITE_ASSISTANT_MODELOS_DOCUMENTOS_EXTRAJUDICIAIS,
  'Modelos de Documentos Judiciais': import.meta.env.VITE_ASSISTANT_MODELOS_DOCUMENTOS_JUDICIAIS,
  'Documentos Administrativos': import.meta.env.VITE_ASSISTANT_MODELOS_DOCUMENTOS_ADMINISTRATIVOS,
  'Funil de Fechamento': import.meta.env.VITE_ASSISTANT_FUNIL_FECHAMENTO_WHATS_REUNIAO,
  'Estratégia de Comunicação': import.meta.env.VITE_ASSISTANT_ESTRATEGIA_COMUNICACAO_PRODUTO_JURIDICO,
  'Plano de Produto': import.meta.env.VITE_ASSISTANT_PLANO_PRODUTO_JURIDICO
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationThread {
  messages: Message[];
  assistantId: string;
  threadId: string;
}

interface ConversationHistory {
  [assistantId: string]: ConversationThread;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<string>(Object.keys(assistantTypes)[0]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Carregar histórico ao iniciar
  useEffect(() => {
    const loadHistory = () => {
      const savedHistory = localStorage.getItem('conversationHistory');
      if (savedHistory) {
        const history: ConversationHistory = JSON.parse(savedHistory);
        const currentAssistant = history[selectedAssistant];
        if (currentAssistant) {
          setMessages(currentAssistant.messages);
          setCurrentThreadId(currentAssistant.threadId);
        }
      }
    };

    loadHistory();
  }, [selectedAssistant]);

  // Salvar histórico quando houver mudanças
  useEffect(() => {
    const saveHistory = () => {
      const savedHistory = localStorage.getItem('conversationHistory') || '{}';
      const history: ConversationHistory = JSON.parse(savedHistory);
      
      history[selectedAssistant] = {
        messages,
        assistantId: assistantTypes[selectedAssistant as keyof typeof assistantTypes],
        threadId: currentThreadId
      };

      localStorage.setItem('conversationHistory', JSON.stringify(history));
    };

    if (messages.length > 0) {
      saveHistory();
    }
  }, [messages, selectedAssistant, currentThreadId]);

  const handleAssistantChange = (newAssistant: string) => {
    setSelectedAssistant(newAssistant);
    const savedHistory = localStorage.getItem('conversationHistory');
    if (savedHistory) {
      const history: ConversationHistory = JSON.parse(savedHistory);
      const assistantHistory = history[newAssistant];
      if (assistantHistory) {
        setMessages(assistantHistory.messages);
        setCurrentThreadId(assistantHistory.threadId);
      } else {
        setMessages([]);
        setCurrentThreadId('');
      }
    }
    setSnackbarMessage('Assistente alterado');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const clearHistory = () => {
    setMessages([]);
    setCurrentThreadId('');
    const savedHistory = localStorage.getItem('conversationHistory') || '{}';
    const history: ConversationHistory = JSON.parse(savedHistory);
    delete history[selectedAssistant];
    localStorage.setItem('conversationHistory', JSON.stringify(history));
    setSnackbarMessage('Histórico limpo');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const getAssistantResponse = async (message: string) => {
    const assistantId = assistantTypes[selectedAssistant as keyof typeof assistantTypes];
    
    if (!assistantId) {
      return "Erro: ID do assistente não encontrado. Por favor, verifique a configuração.";
    }

    try {
      let threadId = currentThreadId;
      
      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        setCurrentThreadId(threadId);
      }
      
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      while (runStatus.status !== "completed") {
        if (runStatus.status === "failed") {
          throw new Error("Execução do assistente falhou");
        }
        if (runStatus.status === "expired") {
          throw new Error("Execução do assistente expirou");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.role === "assistant") {
        return lastMessage.content[0].text.value;
      }
      
      throw new Error("Nenhuma mensagem do assistente encontrada");
    } catch (error) {
      console.error("Erro ao obter resposta do assistente:", error);
      return "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.";
    }
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Configurações do documento
      doc.setFont('helvetica');
      doc.setFontSize(16);
      
      // Título
      const title = `Conversa com ${selectedAssistant}`;
      doc.text(title, 20, 20);
      
      // Data
      doc.setFontSize(12);
      doc.text(new Date().toLocaleString(), 20, 30);
      
      // Linha separadora
      doc.line(20, 35, 190, 35);
      
      // Conteúdo da conversa
      doc.setFontSize(12);
      let yPosition = 45;
      const pageHeight = doc.internal.pageSize.height;
      const marginBottom = 20;
      
      messages.forEach((msg) => {
        // Adiciona o timestamp
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text(timestamp, 20, yPosition);
        yPosition += 7;
        
        // Adiciona o rótulo (Você ou Assistente)
        const role = msg.role === 'user' ? 'Você' : 'Assistente';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(role + ':', 20, yPosition);
        yPosition += 7;
        
        // Adiciona o conteúdo da mensagem
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(msg.content, 170);
        
        // Verifica se precisa de uma nova página
        if (yPosition + (lines.length * 7) + marginBottom > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }
        
        lines.forEach(line => {
          doc.text(line, 20, yPosition);
          yPosition += 7;
        });
        
        yPosition += 5; // Espaço entre mensagens
      });
      
      // Salva o PDF
      const filename = `${title} - ${new Date().toLocaleDateString()}.pdf`;
      doc.save(filename);

      setSnackbarMessage('Documento PDF exportado com sucesso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
      setSnackbarMessage('Erro ao exportar o documento. Tente novamente.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleStartClick = async () => {
    const startMessage = "COMEÇAR";
    const newMessage: Message = { 
      role: 'user', 
      content: startMessage,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const assistantResponse = await getAssistantResponse(startMessage);
      const responseMessage: Message = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, responseMessage]);
    } catch (error) {
      console.error('Erro:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');

    // Verifica se a mensagem contém a palavra "DOCUMENTO"
    if (userMessage.toUpperCase().includes('DOCUMENTO')) {
      const newMessage: Message = { 
        role: 'user', 
        content: userMessage,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newMessage]);
      await exportToPDF();
      return; // Retorna sem enviar para a IA
    }

    // Se não contém DOCUMENTO, processa normalmente
    const newMessage: Message = { 
      role: 'user', 
      content: userMessage,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const assistantResponse = await getAssistantResponse(userMessage);
      const responseMessage: Message = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, responseMessage]);
    } catch (error) {
      console.error('Erro:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ minHeight: '100vh', py: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            minHeight: 'calc(100vh - 2rem)', 
            display: 'flex', 
            flexDirection: 'column', 
            p: 3,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header com gradiente */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #E2C074 0%, #c4a666 100%)',
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 1 }}>
            <Typography variant="h1" color="text.secondary" sx={{ fontSize: '1.75rem', fontWeight: 600 }}>
              Assistente Jurídico Interno
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 280 }}>
                <InputLabel sx={{ color: 'text.secondary' }}>Selecione o Assistente</InputLabel>
                <Select
                  value={selectedAssistant}
                  onChange={(e) => handleAssistantChange(e.target.value)}
                  label="Selecione o Assistente"
                >
                  {Object.keys(assistantTypes).map((type) => (
                    <MenuItem 
                      key={type} 
                      value={type}
                      sx={{ 
                        color: 'text.primary',
                        '&:hover': {
                          backgroundColor: 'rgba(226, 192, 116, 0.1)',
                        },
                      }}
                    >
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Começar nova conversa">
                <IconButton 
                  onClick={handleStartClick}
                  sx={{ 
                    color: '#E2C074',
                    '&:hover': {
                      backgroundColor: 'rgba(226, 192, 116, 0.1)',
                    }
                  }}
                  disabled={isLoading}
                >
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Limpar conversa atual">
                <IconButton 
                  onClick={clearHistory}
                  sx={{ color: 'text.secondary' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, borderColor: 'rgba(226, 192, 116, 0.2)' }} />

          <Box sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            px: 2
          }}>
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  backgroundColor: message.role === 'user' ? 'rgba(226, 192, 116, 0.1)' : 'background.paper',
                  p: 2,
                  borderRadius: 2,
                  borderLeft: message.role === 'assistant' ? '4px solid #E2C074' : 'none',
                  maxWidth: '80%',
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  position: 'relative',
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: message.role === 'user' ? '#E2C074' : '#1E1E1E',
                    color: message.role === 'user' ? '#030409' : '#E2C074',
                  }}
                >
                  {message.role === 'user' ? 'U' : 'A'}
                </Avatar>
                <Box>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.primary"
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {message.content}
                  </Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            sx={{ 
              display: 'flex', 
              gap: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              p: 2,
              borderRadius: 2,
              position: 'relative',
            }}
          >
            <TextField
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              variant="outlined"
              multiline
              maxRows={4}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{ 
                minWidth: 'auto',
                width: 56,
                height: 56,
                borderRadius: '50%',
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </Box>
        </Paper>
      </Container>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ 
            width: '100%',
            backgroundColor: snackbarSeverity === 'success' ? '#1E4620' : '#450A0A',
            color: '#ffffff',
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;