import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Chat } from "./routes/chat/Chat.tsx";
import { Home } from "./routes/home/Home.tsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:projectName/*" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;
