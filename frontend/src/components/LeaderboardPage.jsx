import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Avatar,
  CircularProgress,
  Chip
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";

const LeaderboardPage = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const medalColors = useMemo(() => [
    theme.palette.warning.main,    // Золото
    theme.palette.grey[400],       // Серебро
    theme.palette.secondary.main   // Бронза
  ], [theme]);

  const API_BASE = "http://localhost:3309"
  const fetchLeaders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`);
      if (!res.ok) throw new Error("Ошибка при загрузке таблицы лидеров");
      
      const data = await res.json();
      setLeaders(data);
    } catch (err) {
      console.error("Ошибка при загрузке лидеров:", err);
      enqueueSnackbar(err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchLeaders();
  }, [fetchLeaders]);

  const formatNumber = useCallback((num) =>
    num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") ?? "0"
  , []);

  if (loading) {
    return (
      <Box sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" align="center" sx={{ mb: 3 }}>
        Таблица лидеров
      </Typography>

      <Stack spacing={2}>
        {leaders.map((user, index) => (
          <LeaderCard 
            key={user.id} 
            user={user} 
            index={index} 
            medalColors={medalColors} 
            theme={theme} 
            formatNumber={formatNumber} 
          />
        ))}
      </Stack>
    </Box>
  );
};

const LeaderCard = ({ user, index, medalColors, theme, formatNumber }) => {
  const isTop = index < 3;
  const medalColor = isTop ? medalColors[index] : null;

  return (
    <Card
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        borderRadius: 3,
        bgcolor: theme.palette.background.paper,
        boxShadow: isTop ? 6 : 3,
      }}
    >
      <PositionIndicator index={index} isTop={isTop} medalColor={medalColor} theme={theme} />
      
      <Avatar
        src={user.avatar_path || ""}
        alt={user.name}
        sx={{
          width: 56,
          height: 56,
          mr: 2,
          bgcolor: theme.palette.primary.main
        }}
      />

      <UserInfo user={user} theme={theme} formatNumber={formatNumber} />
      
      <RatingDisplay user={user} formatNumber={formatNumber} />
    </Card>
  );
};

const PositionIndicator = ({ index, isTop, medalColor, theme }) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mr: 2 }}>
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isTop ? 3 : 1,
        bgcolor: medalColor || "rgba(0,0,0,0.08)",
        color: isTop ? "#fff" : theme.palette.text.primary,
        fontWeight: "bold",
        fontSize: 16
      }}
    >
      {index + 1}
    </Box>
  </Box>
);

const UserInfo = ({ user, theme, formatNumber }) => (
  <Box sx={{ flexGrow: 1 }}>
    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
      {user.name}
    </Typography>
    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
      <Chip
        label={`ELO: ${formatNumber(user.elo)}`}
        size="small"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#2e7d32" : "#e8f5e9",
          fontWeight: "bold"
        }}
      />
      <Chip
        label={`Решено: ${formatNumber(user.solved)}`}
        size="small"
        sx={{
          bgcolor: theme.palette.mode === "dark" ? "#1565c0" : "#e3f2fd",
          fontWeight: "bold"
        }}
      />
    </Box>
  </Box>
);

const RatingDisplay = ({ user, formatNumber }) => (
  <Box sx={{ textAlign: "right", minWidth: 110 }}>
    <Typography variant="body2" color="text.secondary">
      Рейтинг
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
      {formatNumber(user.elo)}
    </Typography>
  </Box>
);

export default LeaderboardPage;