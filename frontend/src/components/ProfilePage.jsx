import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  Box,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    const tgUserId = tg.initDataUnsafe?.user?.id;

    if (!tgUserId) {
      console.error("Telegram user id not found");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:3309/api/profile/${tgUserId}/extended`)
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch extended profile:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profileData || !profileData.user) {
    return (
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography color="error">Failed to load user profile</Typography>
      </Box>
    );
  }

  const { user, solved_tasks, matches, battle_wins } = profileData;

  return (
    <Box sx={{ mt: 2, p: 2 }}>
      {/* Основная информация о пользователе */}
      <Card sx={{ borderRadius: 2, bgcolor: "#1e1e1e", boxShadow: 3, mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={`http://localhost:3309${user.avatar_path}`}
              alt={user.name}
              sx={{ width: 80, height: 80 }}
            />
            <Stack spacing={0.5}>
              <Typography variant="h6">{user.name}</Typography>
              <Typography color="text.secondary">{user.bio}</Typography>
              <Typography color="text.secondary" variant="body2">
                Joined: {new Date(user.join_date).toLocaleDateString()}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip 
                  label={`ELO: ${user.elo}`} 
                  color="primary" 
                  size="small" 
                />
                <Chip 
                  label={`Решено: ${user.solved}`} 
                  color="secondary" 
                  size="small" 
                />
                {/* <Chip 
                  icon={<EmojiEventsIcon />}
                  label={`Wins: ${battle_wins || 0}`} 
                  color="warning" 
                  size="small" 
                /> */}
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Табы для переключения между разделами */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Solved Tasks" />
          {/* <Tab label="Match History" /> */}
        </Tabs>
      </Paper>

      {/* Содержимое вкладок */}
      {activeTab === 0 && (
        <SolvedTasksTab solved_tasks={solved_tasks} />
      )}
      
      {/* {activeTab === 1 && (
        <MatchHistoryTab matches={matches} userTgId={user.tg_id} />
      )} */}
    </Box>
  );
};

// Компонент для вкладки с решенными задачами
// Компонент для вкладки с решенными задачами
const SolvedTasksTab = ({ solved_tasks }) => {
  if (!solved_tasks || solved_tasks.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No solved tasks yet
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <List>
        {solved_tasks.map((task, index) => (
          <React.Fragment key={task.id}>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={task.title}
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Language: {task.language}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Difficulty: {task.difficulty}/5
                    </Typography>
                  </>
                }
              />
            </ListItem>
            {index < solved_tasks.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

// Компонент для вкладки с историей матчей
// const MatchHistoryTab = ({ matches, userTgId }) => {
//   if (!matches || matches.length === 0) {
//     return (
//       <Paper sx={{ p: 3, textAlign: 'center' }}>
//         <Typography color="text.secondary">
//           No match history yet
//         </Typography>
//       </Paper>
//     );
//   }

//   return (
//     <Paper>
//       <List>
//         {matches.map((match, index) => (
//           <React.Fragment key={match.id}>
//             <ListItem>
//               <ListItemIcon>
//                 <SportsEsportsIcon 
//                   color={
//                     match.winner_id === userTgId ? "success" : 
//                     match.winner_id ? "error" : "disabled"
//                   } 
//                 />
//               </ListItemIcon>
//               <ListItemText
//                 primary={`Match #${match.id}`}
//                 secondary={
//                   <Box>
//                     <Typography variant="body2" color="text.secondary">
//                       {match.task?.title || `Task #${match.task_id}`}
//                     </Typography>
//                     <Typography variant="body2" color="text.secondary">
//                       {new Date(match.start_time).toLocaleDateString()}
//                       {match.end_time && ` - ${new Date(match.end_time).toLocaleDateString()}`}
//                     </Typography>
//                     <Typography 
//                       variant="body2" 
//                       color={
//                         match.winner_id === userTgId ? "success.main" : 
//                         match.winner_id ? "error.main" : "text.secondary"
//                       }
//                     >
//                       {match.winner_id === userTgId ? "Victory" : 
//                        match.winner_id ? "Defeat" : "In progress"}
//                     </Typography>
//                   </Box>
//                 }
//               />
//             </ListItem>
//             {index < matches.length - 1 && <Divider />}
//           </React.Fragment>
//         ))}
//       </List>
//     </Paper>
//   );
// };

export default ProfilePage;