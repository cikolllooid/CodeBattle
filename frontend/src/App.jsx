import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Tabs, Tab, Box } from "@mui/material";
import TasksPage from "./components/TasksPage";
import LeaderboardPage from "./components/LeaderboardPage";
import CompetitionPage from "./components/CompetitionPage";
import ProfilePage from "./components/ProfilePage";
import BattlePage from "./components/BattlePage";

// Компонент для отображения вкладок только на главной странице
function MainTabs({ activeTab, setActiveTab }) {
  const location = useLocation();
  
  // Не показывать вкладки на странице баттла
  if (location.pathname.startsWith("/battle/")) {
    return null;
  }

  return (
    <Tabs
      value={activeTab}
      onChange={(e, newVal) => setActiveTab(newVal)}
      variant="fullWidth"
      sx={{ position: "fixed", bottom: 0, width: "100%", bgcolor: "#1e1e1e" }}
      textColor="inherit"
      indicatorColor="primary"
    >
      <Tab label="Tasks" value="tasks" />
      <Tab label="Leaderboards" value="leaderboard" />
      <Tab label="Profile" value="profile" sx={{ color: '#fff' }} />
    </Tabs>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState("tasks");
  const location = useLocation();

  return (
    <div className="miniapp-container">
      <Box sx={{ p: 2, pb: location.pathname.startsWith("/battle/") ? 2 : 8 }}>
        <Routes>
          <Route path="/" element={
            <>
              {activeTab === "tasks" && <TasksPage />}
              {activeTab === "leaderboard" && <LeaderboardPage />}
              {activeTab === "profile" && <ProfilePage />}
            </>
          } />
        </Routes>
      </Box>

      <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;