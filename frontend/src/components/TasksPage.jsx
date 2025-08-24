import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Slider,
  Typography,
  Card,
  Button,
  Box,
  Chip,
  Stack,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Collapse
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useSnackbar } from "notistack";
import Editor from "@monaco-editor/react";

const API_BASE = "http://localhost:3309";
const difficultyColors = ["#4caf50", "#8bc34a", "#cddc39", "#ff9800", "#f44336"];

const TasksPage = () => {
  const [difficulty, setDifficulty] = useState([1, 5]);
  const [tasks, setTasks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    difficulty: 1,
    language: "python",
    code: ""
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  
  // Состояния для решения задачи
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [solutionCode, setSolutionCode] = useState("");
  const [submissionResults, setSubmissionResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Новые состояния для решений
  const [correctSolutions, setCorrectSolutions] = useState([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState({});

  // Получаем данные пользователя из Telegram
  const getTelegramUserData = useCallback(() => {
    try {
      const sessionUser = sessionStorage.getItem('telegram_user');
      if (sessionUser) return JSON.parse(sessionUser);
      const tg = window.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
      return null;
    } catch (e) {
      console.error("Error getting Telegram user data:", e);
      return null;
    }
  }, []);

  // Загрузка профиля пользователя
  const fetchUserProfile = useCallback(async (tgId) => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/${tgId}`);
      if (!res.ok) throw new Error("Failed to load user profile");
      
      const data = await res.json();
      setUserProfile(data);
    } catch (err) {
      console.error("Ошибка при загрузке профиля пользователя:", err);
      enqueueSnackbar("Не удалось загрузить профиль пользователя", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // Функция для запроса задач с сервера
  const fetchTasks = useCallback(async (minDifficulty, maxDifficulty) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/tasks?min_difficulty=${minDifficulty}&max_difficulty=${maxDifficulty}`
      );
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Ошибка при загрузке задач:", err);
      enqueueSnackbar("Не удалось загрузить задачи", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  // Загрузка деталей задачи
  const fetchTaskDetails = useCallback(async (taskId) => {
    setLoadingTask(true);
    try {
      const res = await fetch(`${API_BASE}/api/task/${taskId}`);
      if (!res.ok) throw new Error("Не удалось загрузить детали задачи");
      
      const data = await res.json();
      setTaskDetails(data);
      setSolutionCode(data.code || "");
    } catch (err) {
      console.error("Ошибка при загрузке задачи:", err);
      enqueueSnackbar(err.message, { variant: "error" });
    } finally {
      setLoadingTask(false);
    }
  }, [enqueueSnackbar]);

  // Функция для загрузки правильных решений
  const fetchCorrectSolutions = useCallback(async (taskId) => {
    if (!userProfile) return;
    
    setLoadingSolutions(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/solutions/correct/${userProfile.tg_id}/${taskId}`
      );
      if (!response.ok) throw new Error("Не удалось загрузить решения");
      
      const data = await response.json();
      setCorrectSolutions(data);
      
      // Инициализируем состояние развертывания для каждого решения
      const initialExpandedState = {};
      data.forEach((_, index) => {
        initialExpandedState[index] = false;
      });
      setExpandedSolutions(initialExpandedState);
    } catch (error) {
      console.error("Ошибка при загрузке решений:", error);
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setLoadingSolutions(false);
    }
  }, [userProfile, enqueueSnackbar]);

  useEffect(() => {
    const userData = getTelegramUserData();
    if (userData) {
      setCurrentUser(userData);
      fetchUserProfile(userData.id);
    } else {
      setLoading(false);
    }
  }, [getTelegramUserData, fetchUserProfile]);

  useEffect(() => {
    if (!loading) {
      fetchTasks(difficulty[0], difficulty[1]);
    }
  }, [difficulty, loading, fetchTasks]);

  const handleDifficultyChange = (event, newValue) => {
    setDifficulty([Math.max(newValue[0], 1), Math.min(newValue[1], 5)]);
  };

  const handleSolveTask = useCallback(async (task) => {
    setSelectedTask(task);
    await fetchTaskDetails(task.id);
  }, [fetchTaskDetails]);

  const handleBackToList = useCallback(() => {
    setSelectedTask(null);
    setTaskDetails(null);
    setSubmissionResults(null);
    setCorrectSolutions([]);
    setActiveTab(0);
    setExpandedSolutions({});
  }, []);

  const handleSubmitSolution = useCallback(async () => {
    if (!taskDetails || !solutionCode.trim()) {
      enqueueSnackbar("Решение не может быть пустым", { variant: "warning" });
      return;
    }

    if (!currentUser || !userProfile) {
      enqueueSnackbar("Не удалось определить пользователя", { variant: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const solutionData = {
        user_id: userProfile.id,
        task_id: taskDetails.id,
        solution: solutionCode,
      };

      const response = await fetch(`${API_BASE}/api/task/${taskDetails.id}/user/${userProfile.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(solutionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка при отправке решения");
      }

      const data = await response.json();
      setSubmissionResults(data);
      
      if (data.passed === data.total) {
        // Если все тесты пройдены, загружаем правильные решения
        await fetchCorrectSolutions(taskDetails.id);
      }
      
      enqueueSnackbar(`Пройдено тестов: ${data.passed} из ${data.total}`, { 
        variant: data.passed === data.total ? "success" : "warning" 
      });
    } catch (error) {
      console.error("Ошибка при отправке решения:", error);
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }, [taskDetails, solutionCode, currentUser, userProfile, enqueueSnackbar, fetchCorrectSolutions]);

  const handleCreateTask = useCallback(async () => {
    if (!currentUser || !userProfile) {
      enqueueSnackbar("Не удалось определить пользователя", { variant: "error" });
      return;
    }

    if (userProfile.elo < 1000) {
      enqueueSnackbar(
        `У вас недостаточно ELO для создания задания. Требуется минимум 1000. Ваш ELO: ${userProfile.elo}`,
        { variant: "error" }
      );
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/create_task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          difficulty: newTask.difficulty,
          language: newTask.language,
          code: newTask.code,
          tg_id: currentUser.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка при создании задачи");
      }

      const createdTask = await response.json();
      
      // Запуск генерации тестов в фоне
      fetch(`${API_BASE}/api/create_tests/${userProfile.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: createdTask.id, input: "", output: "" })
      }).catch(error => console.error("Network error:", error));

      setTasks(prev => [...prev, createdTask]);
      enqueueSnackbar("Задача успешно создана! Генерация тестов запущена", { variant: "success" });
      handleCloseDialog();
    } catch (error) {
      console.error("Ошибка при создании задачи:", error);
      enqueueSnackbar(error.message, { variant: "error" });
    }
  }, [currentUser, userProfile, newTask, enqueueSnackbar]);

  const handleOpenDialog = useCallback(() => {
    if (!userProfile) {
      enqueueSnackbar("Профиль пользователя не загружен", { variant: "error" });
      return;
    }

    if (userProfile.elo < 1000) {
      enqueueSnackbar(
        `У вас недостаточно ELO для создания задания. Требуется минимум 1000. Ваш ELO: ${userProfile.elo}`,
        { variant: "error" }
      );
      return;
    }

    setOpenDialog(true);
  }, [userProfile, enqueueSnackbar]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setNewTask({
      title: "",
      description: "",
      difficulty: 1,
      language: "python",
      code: ""
    });
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEditorChange = useCallback((value) => {
    setSolutionCode(value);
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
    
    // Если переходим на вкладку "Решения" и решения еще не загружены
    if (newValue === 2 && correctSolutions.length === 0 && taskDetails) {
      fetchCorrectSolutions(taskDetails.id);
    }
  }, [correctSolutions, taskDetails, fetchCorrectSolutions]);

  const toggleSolutionExpand = useCallback((index) => {
    setExpandedSolutions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  // Мемоизированные значения для оптимизации рендеринга
  const filteredTasks = useMemo(() => 
    tasks.filter(task => 
      task.difficulty >= difficulty[0] && 
      task.difficulty <= difficulty[1]
    ), [tasks, difficulty]
  );

  const canCreateTask = useMemo(() => 
    userProfile && userProfile.elo >= 1000, [userProfile]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#121212" }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Рендер страницы решения задачи
  if (selectedTask) {
    return <TaskSolutionView 
      selectedTask={selectedTask}
      taskDetails={taskDetails}
      loadingTask={loadingTask}
      solutionCode={solutionCode}
      submissionResults={submissionResults}
      activeTab={activeTab}
      isSubmitting={isSubmitting}
      difficultyColors={difficultyColors}
      correctSolutions={correctSolutions}
      loadingSolutions={loadingSolutions}
      expandedSolutions={expandedSolutions}
      onBack={handleBackToList}
      onTabChange={handleTabChange}
      onEditorChange={handleEditorChange}
      onSubmit={handleSubmitSolution}
      onToggleSolutionExpand={toggleSolutionExpand}
      onLoadSolutions={() => taskDetails && fetchCorrectSolutions(taskDetails.id)}
    />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <UserProfileInfo userProfile={userProfile} />
      
      <Typography variant="h6" gutterBottom>
        Сложность: {difficulty[0]} - {difficulty[1]}
      </Typography>

      <Slider
        value={difficulty}
        onChange={handleDifficultyChange}
        min={1}
        max={5}
        valueLabelDisplay="auto"
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        {filteredTasks.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            difficultyColors={difficultyColors} 
            onSolve={() => handleSolveTask(task)} 
          />
        ))}
      </Stack>
      
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenDialog}
        disabled={!canCreateTask}
        sx={{ position: "fixed", right: 20, bottom: 20, width: 64, height: 64, boxShadow: 6 }}
      >
        <AddIcon sx={{ fontSize: 32 }} />
      </Fab>
      
      <CreateTaskDialog 
        open={openDialog}
        newTask={newTask}
        difficultyColors={difficultyColors}
        onClose={handleCloseDialog}
        onInputChange={handleInputChange}
        onCreate={handleCreateTask}
      />
    </div>
  );
};

// Вынесенные компоненты для лучшей читаемости
const TaskSolutionView = ({ 
  selectedTask, taskDetails, loadingTask, solutionCode, submissionResults, 
  activeTab, isSubmitting, difficultyColors, correctSolutions, loadingSolutions,
  expandedSolutions, onBack, onTabChange, onEditorChange, onSubmit, 
  onToggleSolutionExpand, onLoadSolutions
}) => (
  <Box sx={{ p: 2, bgcolor: "#121212", minHeight: "100vh", color: "#fff" }}>
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <IconButton onClick={onBack} sx={{ color: "#fff", mr: 1 }}>
        <ArrowBackIcon />
      </IconButton>
      <Typography variant="h5">Решение задачи</Typography>
    </Box>
    
    {loadingTask ? (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress size={60} />
      </Box>
    ) : taskDetails ? (
      <>
        <Card sx={{ p: 3, bgcolor: "#1e1e1e", borderRadius: 2, mb: 3 }}>
          <Typography variant="h4" gutterBottom>{taskDetails.title}</Typography>
          
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Chip
              label={`Сложность: ${taskDetails.difficulty}/5`}
              sx={{ bgcolor: difficultyColors[taskDetails.difficulty - 1], color: "#fff" }}
            />
            <Chip label={taskDetails.language} color="info" />
          </Box>
          
          <Typography variant="h6" gutterBottom>Описание</Typography>
          <Typography variant="body1" sx={{ mb: 3, whiteSpace: "pre-wrap" }}>
            {taskDetails.description}
          </Typography>
        </Card>
        
        <Tabs value={activeTab} onChange={onTabChange} sx={{ mb: 2 }}>
          <Tab label="Редактор кода" />
          <Tab label="Результаты тестирования" disabled={!submissionResults} />
          <Tab label={
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <VisibilityIcon sx={{ mr: 1 }} />
              Решения {correctSolutions.length > 0 ? `(${correctSolutions.length})` : ''}
            </Box>
          } />
        </Tabs>
        
        {activeTab === 0 && (
            <Box sx={{ mb: 3, maxHeight: "70vh", overflowY: "auto" }}>
              <Box sx={{ height: 400, mb: 2 }}>
                <Editor
                  height="100%"
                  language={taskDetails.language}
                  value={solutionCode}
                  onChange={onEditorChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: true,
                    automaticLayout: true
                  }}
                />
              </Box>

              <Button 
                variant="contained" 
                color="primary"
                fullWidth
                size="large"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : "Отправить решение"}
              </Button>
            </Box>
          )}

        
        {activeTab === 1 && submissionResults && (
          <TestResults submissionResults={submissionResults} />
        )}
        
        {activeTab === 2 && (
          <SolutionsView 
            solutions={correctSolutions} 
            loading={loadingSolutions}
            taskLanguage={taskDetails.language}
            expandedSolutions={expandedSolutions}
            onToggleExpand={onToggleSolutionExpand}
            onLoadSolutions={onLoadSolutions}
          />
        )}
      </>
    ) : (
      <Typography variant="h6" align="center" sx={{ mt: 4 }}>
        Не удалось загрузить данные задачи
      </Typography>
    )}
  </Box>
);

const TestResults = ({ submissionResults }) => (
  <Card sx={{ p: 3, bgcolor: "#1e1e1e", borderRadius: 2 }}>
    <Typography variant="h6" gutterBottom>Результаты тестирования</Typography>
    
    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
      <Chip
        label={`Пройдено: ${submissionResults.passed}/${submissionResults.total}`}
        color={submissionResults.passed === submissionResults.total ? "success" : "warning"}
        sx={{ fontSize: "1rem", padding: "8px 16px" }}
      />
      <Typography variant="body1" sx={{ ml: 2 }}>
        {submissionResults.passed === submissionResults.total 
          ? "Все тесты пройдены успешно!" 
          : "Есть непройденные тесты"}
      </Typography>
    </Box>
    
    <TableContainer component={Paper} sx={{ bgcolor: "#2d2d2d", maxHeight: 400, overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Тест</TableCell>
            <TableCell>Входные данные</TableCell>
            <TableCell>Ожидаемый результат</TableCell>
            <TableCell>Фактический результат</TableCell>
            <TableCell>Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {submissionResults.results.map((test, index) => (
            <TableRow key={index}>
              <TableCell>#{index + 1}</TableCell>
              <TableCell sx={{ fontFamily: "monospace", maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {test.input}
              </TableCell>
              <TableCell sx={{ fontFamily: "monospace", maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {test.expected}
              </TableCell>
              <TableCell sx={{ fontFamily: "monospace", maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {test.actual || test.error || "—"}
              </TableCell>
              <TableCell>
                {test.passed ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Card>
);

const SolutionsView = ({ solutions, loading, taskLanguage, expandedSolutions, onToggleExpand, onLoadSolutions }) => {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (solutions.length === 0) {
    return (
      <Card sx={{ p: 3, bgcolor: "#1e1e1e", borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Правильные решения
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Пока нет решений для этой задачи. Будьте первым!
        </Typography>
        <Button variant="contained" onClick={onLoadSolutions}>
          Загрузить решения
        </Button>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3, bgcolor: "#1e1e1e", borderRadius: 2, maxHeight: "70vh", overflowY: "auto" }}>
    <Typography variant="h6" gutterBottom>
      Правильные решения ({solutions.length})
    </Typography>
      
      <List sx={{ width: "100%", bgcolor: "#2d2d2d", borderRadius: 1 }}>
        {solutions.map((solution, index) => (
          <React.Fragment key={index}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar>
                  {solution.username ? solution.username.charAt(0).toUpperCase() : "U"}
                </Avatar>
              </ListItemAvatar>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ListItemText
                    primary={solution.username || "Анонимный пользователь"}
                  />
                  <IconButton onClick={() => onToggleExpand(index)}>
                    {expandedSolutions[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={expandedSolutions[index]} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 1, height: 300, overflow: 'auto' }}>
                    <Editor
                      height="100%"
                      language={taskLanguage}
                      value={solution.solution}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: true,
                        automaticLayout: true,
                        scrollbar: {
                          vertical: 'visible',
                          horizontal: 'visible'
                        }
                      }}
                    />
                  </Box>
                </Collapse>
                
                {!expandedSolutions[index] && (
                  <Box sx={{ 
                    mt: 1, 
                    p: 1, 
                    bgcolor: '#1e1e1e', 
                    borderRadius: 1,
                    maxHeight: 100,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <Box sx={{ 
                      fontFamily: 'monospace', 
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px',
                      filter: !expandedSolutions[index] ? 'blur(0.5px)' : 'none',
                      opacity: !expandedSolutions[index] ? 0.7 : 1
                    }}>
                      {solution.solution.length > 200 
                        ? `${solution.solution.substring(0, 200)}...` 
                        : solution.solution}
                    </Box>
                    {!expandedSolutions[index] && solution.solution.length > 200 && (
                      <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '30px',
                        background: 'linear-gradient(transparent, #2d2d2d)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingBottom: '5px'
                      }}>
                        <Typography variant="caption" sx={{ color: '#aaa' }}>
                          Нажмите для просмотра полного решения
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </ListItem>
            {index < solutions.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Card>
  );
};

const UserProfileInfo = ({ userProfile }) => (
  userProfile && (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, p: 2, bgcolor: "#1e1e1e", borderRadius: 2 }}>
      <Typography variant="body1"><strong>Ваш ELO:</strong> {userProfile.elo}</Typography>
      <Tooltip title={userProfile.elo >= 1000 ? "Вы можете создавать новые задачи" : "Требуется 1000 ELO для создания задач"}>
        <Typography variant="body1" color={userProfile.elo >= 1000 ? "success.main" : "error.main"}>
          {userProfile.elo >= 1000 ? "✓ Доступно создание задач" : "✗ Требуется 1000 ELO"}
        </Typography>
      </Tooltip>
    </Box>
  )
);

const TaskCard = ({ task, difficultyColors, onSolve }) => (
  <Card sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderRadius: 2, bgcolor: "#1e1e1e", boxShadow: 3, "&:hover": { boxShadow: 6 } }}>
    <Box>
      <Typography variant="h6">{task.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {task.description.substring(0, 50)}{task.description.length > 50 ? "..." : ""}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <Chip
          label={`Сложность: ${task.difficulty}/5`}
          sx={{ bgcolor: difficultyColors[task.difficulty - 1], color: "#fff" }}
          size="small"
        />
        <Chip label={task.language} color="info" size="small" />
      </Box>
    </Box>

    <Button variant="contained" size="medium" onClick={onSolve}>
      Решить
    </Button>
  </Card>
);

const CreateTaskDialog = ({ open, newTask, difficultyColors, onClose, onInputChange, onCreate }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ bgcolor: "#1e1e1e", color: "#fff" }}>Создать новую задачу</DialogTitle>
    <DialogContent sx={{ bgcolor: "#1e1e1e", pt: 2 }}>
      <form>
        <TextField
          autoFocus
          margin="dense"
          name="title"
          label="Название задачи"
          type="text"
          fullWidth
          variant="outlined"
          value={newTask.title}
          onChange={onInputChange}
          sx={{ mb: 2 }}
          InputLabelProps={{ style: { color: "#aaa" } }}
          InputProps={{ style: { color: "#fff" } }}
          required
        />
        
        <TextField
          margin="dense"
          name="description"
          label="Описание задачи"
          type="text"
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={newTask.description}
          onChange={onInputChange}
          sx={{ mb: 2 }}
          InputLabelProps={{ style: { color: "#aaa" } }}
          InputProps={{ style: { color: "#fff" } }}
        />
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: "#aaa" }}>Сложность</InputLabel>
          <Select
            name="difficulty"
            value={newTask.difficulty}
            onChange={onInputChange}
            label="Сложность"
            sx={{ color: "#fff" }}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <MenuItem key={level} value={level}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: difficultyColors[level - 1], borderRadius: "50%", mr: 1 }} />
                  Уровень {level}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: "#aaa" }}>Язык программирования</InputLabel>
          <Select
            name="language"
            value={newTask.language}
            onChange={onInputChange}
            label="Язык программирования"
            sx={{ color: "#fff" }}
          >
            <MenuItem value="python">Python</MenuItem>
            <MenuItem value="js">JavaScript</MenuItem>
            <MenuItem value="cpp">C++</MenuItem>
            <MenuItem value="c">C</MenuItem>
            <MenuItem value="rust">Rust</MenuItem>
            <MenuItem value="go">Go</MenuItem>
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          name="code"
          label="Исходный код решения"
          type="text"
          fullWidth
          variant="outlined"
          multiline
          rows={6}
          value={newTask.code}
          onChange={onInputChange}
          sx={{ mb: 2 }}
          InputLabelProps={{ style: { color: "#aaa" } }}
          InputProps={{ style: { color: "#fff" } }}
          required
        />
      </form>
    </DialogContent>
    <DialogActions sx={{ bgcolor: "#1e1e1e", borderTop: "1px solid #333" }}>
      <Button onClick={onClose} sx={{ color: "#aaa" }}>Отмена</Button>
      <Button onClick={onCreate} variant="contained" disabled={!newTask.title.trim() || !newTask.code.trim()}>
        Создать
      </Button>
    </DialogActions>
  </Dialog>
);

export default TasksPage;