import { useState, useRef, useEffect } from 'react';
import { 
  Container, Box, Button, TextField, Paper, Typography, 
  ThemeProvider, CssBaseline, Snackbar, Alert, CircularProgress,
  CardContent, CardActionArea, IconButton, Tooltip, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Zoom, Fade, Grid
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import SaveIcon from '@mui/icons-material/Save';
import StarIcon from '@mui/icons-material/Star';
import { theme } from './theme';
import { assistants } from './config/assistants';
import { openai } from './config/openai';
import jsPDF from 'jspdf';

interface Message {
  role: 'user' | 'assistant';
  content: Array<{ type: 'text'; text: { value: string } }>;
  timestamp: number;
}

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedConversations, setSavedConversations] = useState<{
    id: string;
    title: string;
    messages: Message[];
    assistantId: string;
    timestamp: number;
  }[]>([]);
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startConversation = async (assistantId: string) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setSelectedAssistant(assistantId);

      const thread = await openai.beta.threads.create();
      setCurrentThreadId(thread.id);

      const userMessage = {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: { value: 'COMEÇAR' } }],
        timestamp: new Date().toISOString()
      };
      
      setMessages([userMessage]);

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: 'COMEÇAR'
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId
      });

      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status === 'failed') {
        throw new Error('Falha ao iniciar conversa');
      }

      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0];

      if (response.role === 'assistant' && response.content[0].type === 'text') {
        const assistantMessage = {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: { value: response.content[0].text.value } }],
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Erro ao iniciar:', error);
      setSnackbarMessage('Erro ao iniciar conversa. Tente novamente.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentThreadId || !selectedAssistant || isLoading) return;

    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    const userMessage = {
      role: 'user' as const,
      content: [{ type: 'text' as const, text: { value: currentInput } }],
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: currentInput
      });

      const run = await openai.beta.threads.runs.create(currentThreadId, {
        assistant_id: selectedAssistant
      });

      let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      }

      if (runStatus.status === 'failed') {
        throw new Error('Falha ao processar mensagem');
      }

      const messages = await openai.beta.threads.messages.list(currentThreadId);
      const response = messages.data[0];

      if (response.role === 'assistant' && response.content[0].type === 'text') {
        const assistantMessage = {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: { value: response.content[0].text.value } }],
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setSnackbarMessage('Erro ao enviar mensagem. Tente novamente.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdf = new jsPDF();
    let y = 20;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    const textWidth = pageWidth - (margin * 2);
    
    // Cabeçalho com logo e título
    pdf.setFillColor(226, 192, 116); // Cor dourada
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.text('Histórico de Conversa', margin, 28);
    
    y = 50;
    
    // Informações do assistente
    const assistant = assistants.find(a => a.id === selectedAssistant);
    if (assistant) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y, textWidth, 30, 'F');
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text('Detalhes da Conversa:', margin + 5, y + 10);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Assistente: ${assistant.name}`, margin + 5, y + 20);
      
      y += 40;
    }
    
    // Estatísticas da conversa
    const stats = {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      assistantMessages: messages.filter(m => m.role === 'assistant').length,
      startTime: new Date(messages[0]?.timestamp || Date.now()).toLocaleString(),
      endTime: new Date(messages[messages.length - 1]?.timestamp || Date.now()).toLocaleString()
    };
    
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y, textWidth, 40, 'F');
    
    pdf.setFont("helvetica", "bold");
    pdf.text('Estatísticas:', margin + 5, y + 10);
    pdf.setFont("helvetica", "normal");
    pdf.text([
      `Total de mensagens: ${stats.totalMessages}`,
      `Suas mensagens: ${stats.userMessages}`,
      `Respostas do assistente: ${stats.assistantMessages}`
    ], margin + 5, y + 20);
    
    y += 50;
    
    // Timeline das mensagens
    messages.forEach((message, index) => {
      const isUser = message.role === 'user';
      const text = message.content[0].text.value;
      const date = new Date(message.timestamp).toLocaleString();
      
      // Círculo indicador
      pdf.setFillColor(isUser ? '#E2C074' : '#1A1C23');
      pdf.circle(margin + 5, y + 5, 3, 'F');
      
      // Linha conectora
      if (index < messages.length - 1) {
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin + 5, y + 8, margin + 5, y + 25);
      }
      
      // Caixa da mensagem
      pdf.setFillColor(isUser ? 255 : 245, isUser ? 255 : 245, isUser ? 255 : 245);
      const messageBox = {
        x: margin + 15,
        y: y,
        width: textWidth - 20,
        padding: 10
      };
      
      // Cabeçalho da mensagem
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(isUser ? 'Você' : 'Assistente', messageBox.x + messageBox.padding, y + 10);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(date, messageBox.x + messageBox.padding + 50, y + 10);
      
      // Conteúdo da mensagem
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      const splitText = pdf.splitTextToSize(text, messageBox.width - (messageBox.padding * 2));
      
      pdf.rect(messageBox.x, messageBox.y, messageBox.width, 20 + (splitText.length * 5), 'F');
      pdf.text(splitText, messageBox.x + messageBox.padding, y + 20);
      
      y += 30 + (splitText.length * 5);
      
      // Nova página se necessário
      if (y > pdf.internal.pageSize.height - 20) {
        pdf.addPage();
        y = 20;
      }
    });
    
    // Rodapé
    const addFooter = (pageNumber: number) => {
      const totalPages = pdf.internal.getNumberOfPages();
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(
        `Página ${pageNumber} de ${totalPages} | Gerado em ${new Date().toLocaleString()} | Thread ID: ${currentThreadId}`,
        margin,
        pdf.internal.pageSize.height - 10
      );
    };
    
    // Adiciona rodapé em todas as páginas
    for (let i = 1; i <= pdf.internal.getNumberOfPages(); i++) {
      pdf.setPage(i);
      addFooter(i);
    }
    
    // Salva o PDF
    const fileName = `chat-${assistant?.name}-${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    pdf.save(fileName);
    
    setSnackbarMessage('Conversa salva em PDF com sucesso!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleCopyConversation = () => {
    const conversationText = messages.map(message => {
      const role = message.role === 'user' ? 'Você' : 'Assistente';
      const text = message.content[0].text.value;
      const date = new Date(message.timestamp).toLocaleString();
      return `[${date}] ${role}:\n${text}\n`;
    }).join('\n');
    
    navigator.clipboard.writeText(conversationText);
    setSnackbarMessage('Conversa copiada para a área de transferência!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const toggleFavorite = (assistantId: string) => {
    setFavorites(prev => 
      prev.includes(assistantId) 
        ? prev.filter(id => id !== assistantId)
        : [...prev, assistantId]
    );
  };

  const handleSaveConversation = () => {
    if (messages.length === 0) return;
    
    const newConversation = {
      id: `conv_${Date.now()}`,
      title: conversationTitle || `Conversa com ${assistants.find(a => a.id === selectedAssistant)?.name}`,
      messages,
      assistantId: selectedAssistant,
      timestamp: Date.now()
    };
    
    setSavedConversations(prev => [...prev, newConversation]);
    setShowSavedDialog(false);
    setConversationTitle('');
    
    setSnackbarMessage('Conversa salva com sucesso!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleShareConversation = async () => {
    try {
      const conversationText = messages.map(message => {
        const role = message.role === 'user' ? 'Você' : 'Assistente';
        const text = message.content[0].text.value;
        return `${role}: ${text}\n`;
      }).join('\n');
      
      await navigator.share({
        title: 'Minha conversa com o assistente',
        text: conversationText
      });
      
      setSnackbarMessage('Conversa compartilhada com sucesso!');
      setSnackbarSeverity('success');
    } catch (error) {
      setSnackbarMessage('Erro ao compartilhar. Tente copiar a conversa.');
      setSnackbarSeverity('error');
    }
    setSnackbarOpen(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1,
          gap: 3,
          py: 3,
          height: 'calc(100vh - 64px)',
          overflow: 'hidden'
        }}>
          {/* Lista de Assistentes */}
          <Box sx={{ 
            width: 300,
            overflowY: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 2
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'common.white' }}>
              Assistentes
            </Typography>
            
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              {assistants.map((assistant) => (
                <Box 
                  key={assistant.id}
                  sx={{
                    bgcolor: selectedAssistant === assistant.id ? 'primary.main' : 'background.paper',
                    p: 2,
                    borderRadius: 2,
                    boxShadow: selectedAssistant === assistant.id ? 8 : 1
                  }}
                >
                  <Typography 
                    variant="h6"
                    sx={{ 
                      color: selectedAssistant === assistant.id ? '#000000' : '#FFFFFF',
                      fontWeight: 'bold',
                      mb: 1
                    }}
                  >
                    {assistant.name}
                  </Typography>
                  
                  <Typography 
                    variant="body2"
                    sx={{ 
                      color: selectedAssistant === assistant.id ? '#000000' : 'text.secondary',
                      mb: 2
                    }}
                  >
                    {assistant.description}
                  </Typography>
                  
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    disabled={isLoading}
                    onClick={() => startConversation(assistant.id)}
                    startIcon={<PlayArrowIcon />}
                    sx={{
                      bgcolor: selectedAssistant === assistant.id ? 'common.white' : 'primary.main',
                      color: selectedAssistant === assistant.id ? 'primary.main' : 'common.white',
                      '&:hover': {
                        bgcolor: selectedAssistant === assistant.id ? 'common.white' : 'primary.dark'
                      }
                    }}
                  >
                    {isLoading && selectedAssistant === assistant.id ? (
                      <CircularProgress size={24} />
                    ) : (
                      'Começar'
                    )}
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Área do Chat */}
          <Box sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 2,
              flexWrap: 'wrap'
            }}>
              <Tooltip title="Limpar conversa">
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => {
                    setMessages([]);
                    setCurrentThreadId('');
                    setSelectedAssistant('');
                    setSnackbarMessage('Conversa limpa com sucesso');
                    setSnackbarSeverity('success');
                    setSnackbarOpen(true);
                  }}
                  startIcon={<DeleteIcon />}
                >
                  Limpar
                </Button>
              </Tooltip>
              
              <Tooltip title="Baixar PDF">
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleDownloadPDF}
                  startIcon={<DownloadIcon />}
                  disabled={messages.length === 0}
                >
                  PDF
                </Button>
              </Tooltip>

              <Tooltip title="Copiar">
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleCopyConversation}
                  startIcon={<ContentCopyIcon />}
                  disabled={messages.length === 0}
                >
                  Copiar
                </Button>
              </Tooltip>

              <Tooltip title="Compartilhar">
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleShareConversation}
                  startIcon={<ShareIcon />}
                  disabled={messages.length === 0}
                >
                  Compartilhar
                </Button>
              </Tooltip>

              <Tooltip title="Salvar">
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setShowSavedDialog(true)}
                  startIcon={<SaveIcon />}
                  disabled={messages.length === 0}
                >
                  Salvar
                </Button>
              </Tooltip>
            </Box>

            {/* Área do chat */}
            <Paper 
              sx={{ 
                flexGrow: 1,
                height: 'calc(100vh - 200px)', 
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <Box sx={{ 
                flex: 1,
                p: 2,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                {messages.map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      bgcolor: message.role === 'user' ? 'primary.main' : 'background.default',
                      color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      p: 2,
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body1">
                      {message.content[0].text.value}
                    </Typography>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      value={input}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      disabled={!selectedAssistant || isLoading}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        sx: { bgcolor: 'background.paper' }
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!input.trim() || !selectedAssistant || isLoading}
                      sx={{ minWidth: 100 }}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Enviar'}
                    </Button>
                  </Box>
                </form>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Diálogo para salvar conversa */}
        <Dialog open={showSavedDialog} onClose={() => setShowSavedDialog(false)}>
          <DialogTitle>Salvar Conversa</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Título da conversa"
              fullWidth
              variant="outlined"
              value={conversationTitle}
              onChange={(e) => setConversationTitle(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSavedDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveConversation} variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default App;