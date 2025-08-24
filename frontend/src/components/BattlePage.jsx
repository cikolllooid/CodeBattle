import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Button, Box, Typography, TextField, Paper, 
  CircularProgress, Alert, Card, CardContent 
} from '@mui/material';
import { useSnackbar } from 'notistack';

const BattlePage = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [battleInfo, setBattleInfo] = useState(null);
  const [userDbId, setUserDbId] = useState(null);
  
  const API_BASE = "http:localhost://3309"
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || Number(localStorage.getItem("tg_id"));

  const fetchUserProfile = useCallback(async () => {
    if (!tgId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/profile/${tgId}`);
      if (!response.ok) throw new Error('Ошибка загрузки профиля пользователя');
      
      const userData = await response.json();
      setUserDbId(userData.id);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      enqueueSnackbar('Ошибка загрузки профиля пользователя', { variant: 'error' });
    }
  }, [tgId, enqueueSnackbar]);

  const fetchBattleInfo = useCallback(async () => {
    if (!userDbId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/competitions/${battleId}`);
      if (!response.ok) throw new Error('Ошибка загрузки информации о матче');
      
      const data = await response.json();
      setBattleInfo(data);
    } catch (err) {
      console.error('Ошибка загрузки информации о матче:', err);
      enqueueSnackbar('Ошибка загрузки информации о матче', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [battleId, userDbId, enqueueSnackbar]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (userDbId) {
      fetchBattleInfo();
    }
  }, [userDbId, fetchBattleInfo]);

  const handleSubmit = useCallback(async () => {
    if (!battleInfo || !battleInfo.task_id || !userDbId) {
      enqueueSnackbar('Информация о задаче или пользователе не загружена', { variant: 'error' });
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/task/${battleInfo.task_id}/user/${userDbId}/post_competition/${battleInfo.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution: code, user_id: userDbId, task_id: battleInfo.task_id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка отправки решения');
      }

      const data = await response.json();
      setResults(data);
      enqueueSnackbar('Решение отправлено!', { variant: 'success' });
    } catch (err) {
      setError(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [battleInfo, userDbId, code, enqueueSnackbar]);

  const handleLeave = useCallback(async () => {
    if (!userDbId) {
      enqueueSnackbar('Информация о пользователе не загружена', { variant: 'error' });
      return;
    }
    
    try {
      await fetch(`${API_BASE}/api/competitions/leave/${battleId}/player/${tgId}`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Ошибка при выходе из битвы:', err);
      enqueueSnackbar('Ошибка при выходе из битвы', { variant: 'error' });
    }
    navigate(-1);
  }, [userDbId, battleId, tgId, navigate, enqueueSnackbar]);

  if (loading || !userDbId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Битва #{battleId}</Typography>
      
      {battleInfo && <BattleInfo battleInfo={battleInfo} />}

      <CodeEditor 
        code={code} 
        setCode={setCode} 
        onSubmit={handleSubmit} 
        onLeave={handleLeave} 
        submitting={submitting} 
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {results && <TestResults results={results} />}
    </Box>
  );
};

const BattleInfo = ({ battleInfo }) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>Информация о матче</Typography>
      <Typography>ID задачи: {battleInfo.task_id}</Typography>
      <Typography>Игрок 1: {battleInfo.player1_id}</Typography>
      <Typography>Игрок 2: {battleInfo.player2_id || 'Ожидание...'}</Typography>
    </CardContent>
  </Card>
);

const CodeEditor = ({ code, setCode, onSubmit, onLeave, submitting }) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Typography variant="h6" gutterBottom>Ваше решение:</Typography>
    <TextField
      multiline
      fullWidth
      minRows={6}
      maxRows={15}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      placeholder="Введите ваш код здесь..."
      variant="outlined"
    />
    
    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={submitting || !code.trim()}
      >
        {submitting ? <CircularProgress size={24} /> : 'Отправить решение'}
      </Button>
      
      <Button variant="outlined" onClick={onLeave}>
        Покинуть матч
      </Button>
    </Box>
  </Paper>
);

const TestResults = ({ results }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6">Результаты:</Typography>
    <Typography>Пройдено тестов: {results.passed}/{results.total}</Typography>
    
    {results.results && results.results.map((result, index) => (
      <Box key={index} sx={{ mt: 1, p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
        <Typography variant="subtitle2">Тест #{index + 1}</Typography>
        <Typography color={result.passed ? 'success.main' : 'error.main'}>
          {result.passed ? 'Пройден' : 'Не пройден'}
        </Typography>
        {result.input && <Typography variant="body2">Входные данные: {result.input}</Typography>}
        {result.expected && <Typography variant="body2">Ожидаемый вывод: {result.expected}</Typography>}
        {result.actual && <Typography variant="body2">Полученный вывод: {result.actual}</Typography>}
        {result.error && <Typography variant="body2" color="error">Ошибка: {result.error}</Typography>}
      </Box>
    ))}
  </Paper>
);

export default BattlePage;