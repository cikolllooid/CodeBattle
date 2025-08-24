import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button, Card, CardContent, Typography, CircularProgress,
  Box, Stack, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, InputAdornment,
  List, ListItem, ListItemText, Divider
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

const CompetitionPage = () => {
  const API_BASE = "http://localhost:3309"
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || Number(localStorage.getItem("tg_id"));
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [taskLoading, setTaskLoading] = useState(true);
  const [userActiveMatch, setUserActiveMatch] = useState(null);
  const [matchSearchTerm, setMatchSearchTerm] = useState("");
  const [matchName, setMatchName] = useState("");
  const [availableTasks, setAvailableTasks] = useState([]);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/competitions`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const matchesData = Array.isArray(data) ? data : [];
      setMatches(matchesData);
      
      const userMatch = matchesData.find(match => 
        (match.player1_id === tgId || match.player2_id === tgId) && match.is_active
      );
      
      if (userMatch) {
        setUserActiveMatch(userMatch);
        if (userMatch.player2_id) navigate(`/battle/${userMatch.id}`);
      } else {
        setUserActiveMatch(null);
      }
    } catch (err) {
      console.error("Match loading error:", err);
      enqueueSnackbar("Ошибка загрузки матчей", { variant: "error" });
      setMatches([]);
      setUserActiveMatch(null);
    }
  }, [tgId, navigate, enqueueSnackbar]);

  const fetchTasks = useCallback(async () => {
    try {
      setTaskLoading(true);
      const response = await fetch(`${API_BASE}/api/tasks?min_difficulty=1&max_difficulty=5`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const tasks = Array.isArray(data) ? data : [];
      setAvailableTasks(tasks);
    } catch (err) {
      console.error("Task loading error:", err);
      enqueueSnackbar("Ошибка загрузки задач", { variant: "error" });
      setAvailableTasks([]);
    } finally {
      setTaskLoading(false);
    }
  }, [enqueueSnackbar]);

  const filteredTasks = useMemo(() => {
    if (searchTerm.trim() === "") return availableTasks;
    return availableTasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, availableTasks]);

  const filteredMatches = useMemo(() => {
    if (matchSearchTerm.trim() === "") return matches;
    
    return matches.filter(match => {
      const task = availableTasks.find(t => t.id === match.task_id);
      if (task && task.title.toLowerCase().includes(matchSearchTerm.toLowerCase())) return true;
      return match.id.toString().includes(matchSearchTerm);
    });
  }, [matchSearchTerm, matches, availableTasks]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMatches(), fetchTasks()]);
      setLoading(false);
    };
    
    loadData();
    
    const interval = setInterval(fetchMatches, 5000);
    return () => clearInterval(interval);
  }, [fetchMatches, fetchTasks]);

  const createMatch = useCallback(async () => {
    if (!selectedTaskId) {
      enqueueSnackbar("Выберите задачу", { variant: "warning" });
      return;
    }

    if (!matchName.trim()) {
      enqueueSnackbar("Введите название матча", { variant: "warning" });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`${API_BASE}/api/competitions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: parseInt(selectedTaskId),
          player1_id: tgId,
          is_active: true,
          name: matchName.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка создания");
      }
      
      enqueueSnackbar("Матч создан! Ожидаем второго игрока...", { variant: "success" });
      setOpenCreate(false);
      setSelectedTaskId("");
      setMatchName("");
      fetchMatches();
    } catch (err) {
      enqueueSnackbar(err.message || "Ошибка создания", { variant: "error" });
    } finally {
      setCreating(false);
    }
  }, [selectedTaskId, matchName, tgId, enqueueSnackbar, fetchMatches]);

  const joinMatch = useCallback(async (matchId) => {
    try {
      const response = await fetch(`${API_BASE}/api/competitions/join/${matchId}/${tgId}`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка присоединения");
      }
      
      enqueueSnackbar("Вы присоединились к матчу!", { variant: "success" });
      fetchMatches();
      navigate(`/battle/${matchId}`);
    } catch (err) {
      enqueueSnackbar(err.message || "Ошибка присоединения", { variant: "error" });
    }
  }, [tgId, navigate, enqueueSnackbar, fetchMatches]);

  const leaveMatch = useCallback(async (matchId) => {
    try {
      const response = await fetch(`${API_BASE}/api/competitions/leave/${matchId}/player/${tgId}`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка выхода из матча");
      }
      
      enqueueSnackbar("Вы вышли из матча", { variant: "info" });
      setUserActiveMatch(null);
      fetchMatches();
    } catch (err) {
      enqueueSnackbar(err.message || "Ошибка выхода из матча", { variant: "error" });
    }
  }, [tgId, enqueueSnackbar, fetchMatches]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", pb: 8, minHeight: "100vh", bgcolor: "background.default", p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        <SportsEsportsIcon sx={{ mr: 1 }} />Coding Battles
      </Typography>

      {userActiveMatch && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Вы участвуете в матче #{userActiveMatch.id}
          <Button size="small" color="inherit" sx={{ ml: 2 }} onClick={() => leaveMatch(userActiveMatch.id)}>
            Покинуть матч
          </Button>
        </Alert>
      )}

      <MatchSearch matchSearchTerm={matchSearchTerm} setMatchSearchTerm={setMatchSearchTerm} />

      {filteredMatches.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>Нет активных матчей. Создайте первый!</Alert>
      ) : (
        <MatchList 
          matches={filteredMatches} 
          availableTasks={availableTasks} 
          tgId={tgId} 
          userActiveMatch={userActiveMatch} 
          onJoin={joinMatch} 
        />
      )}

      <CreateMatchDialog
        open={openCreate}
        searchTerm={searchTerm}
        selectedTaskId={selectedTaskId}
        matchName={matchName}
        taskLoading={taskLoading}
        filteredTasks={filteredTasks}
        creating={creating}
        onClose={() => {
          setOpenCreate(false);
          setSearchTerm("");
          setSelectedTaskId("");
          setMatchName("");
        }}
        onSearchChange={setSearchTerm}
        onTaskSelect={setSelectedTaskId}
        onMatchNameChange={setMatchName}
        onCreate={createMatch}
      />

      <Fab
        color="primary"
        onClick={() => setOpenCreate(true)}
        disabled={userActiveMatch !== null}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

const MatchSearch = ({ matchSearchTerm, setMatchSearchTerm }) => (
  <TextField
    fullWidth
    label="Поиск матчей"
    value={matchSearchTerm}
    onChange={(e) => setMatchSearchTerm(e.target.value)}
    sx={{ mb: 2 }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon />
        </InputAdornment>
      ),
    }}
    placeholder="Введите ID матча или название задачи"
  />
);

const MatchList = ({ matches, availableTasks, tgId, userActiveMatch, onJoin }) => (
  <Stack spacing={2}>
    {matches.map((match) => {
      const task = availableTasks.find(t => t.id === match.task_id);
      
      return (
        <Card key={match.id} sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {match.name || `Матч #${match.id}`}
              {task && ` - ${task.title}`}
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="body2">Игрок 1: {match.player1_id}</Typography>
              <Typography variant="body2">Игрок 2: {match.player2_id || "Ожидание..."}</Typography>
            </Box>

            {task && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Сложность: {task.difficulty}/5
              </Typography>
            )}

            <Button
              variant="contained"
              fullWidth
              disabled={match.player1_id === tgId || match.player2_id || userActiveMatch}
              onClick={() => onJoin(match.id)}
            >
              {match.player1_id === tgId ? "Вы создатель" : 
              match.player2_id ? "Матч заполнен" : "Присоединиться"}
            </Button>
          </CardContent>
        </Card>
      );
    })}
  </Stack>
);

const CreateMatchDialog = ({
  open, searchTerm, selectedTaskId, matchName, taskLoading,
  filteredTasks, creating, onClose, onSearchChange, onTaskSelect,
  onMatchNameChange, onCreate
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { minHeight: '60vh' } }}>
    <DialogTitle>Создать матч</DialogTitle>
    <DialogContent>
      <TextField
        fullWidth
        label="Название матча"
        value={matchName}
        onChange={(e) => onMatchNameChange(e.target.value)}
        sx={{ mt: 2, mb: 2 }}
        placeholder="Введите название для вашего матча"
      />
      
      <TextField
        fullWidth
        label="Поиск задач"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        placeholder="Введите название или описание задачи"
      />
      
      <Box sx={{ maxHeight: '40vh', overflow: 'auto' }}>
        {taskLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredTasks.length === 0 ? (
          <Alert severity="info">
            {searchTerm ? "Не найдено задач по вашему запросу" : "Нет доступных задач"}
          </Alert>
        ) : (
          <TaskList tasks={filteredTasks} selectedTaskId={selectedTaskId} onTaskSelect={onTaskSelect} />
        )}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Отмена</Button>
      <Button onClick={onCreate} disabled={creating || !selectedTaskId || !matchName.trim()} variant="contained">
        {creating ? <CircularProgress size={24} /> : "Создать матч"}
      </Button>
    </DialogActions>
  </Dialog>
);

const TaskList = ({ tasks, selectedTaskId, onTaskSelect }) => (
  <List>
    {tasks.map((task) => (
      <React.Fragment key={task.id}>
        <ListItem 
          button 
          selected={selectedTaskId === task.id.toString()}
          onClick={() => onTaskSelect(task.id.toString())}
        >
          <ListItemText
            primary={task.title}
            secondary={
              <React.Fragment>
                <Typography variant="body2" color="text.primary">
                  Сложность: {task.difficulty}/5
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Язык: {task.language}
                </Typography>
                {task.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {task.description.length > 100 
                      ? `${task.description.substring(0, 100)}...` 
                      : task.description
                    }
                  </Typography>
                )}
              </React.Fragment>
            }
          />
        </ListItem>
        <Divider />
      </React.Fragment>
    ))}
  </List>
);

export default CompetitionPage;