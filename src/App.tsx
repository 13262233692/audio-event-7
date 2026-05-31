import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import AnnotationWorkspace from "@/pages/AnnotationWorkspace";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:id" element={<AnnotationWorkspace />} />
      </Routes>
    </Router>
  );
}
