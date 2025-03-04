import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Customers from "./pages/Customers";
import Appointments from "./pages/Appointments";

function App() {
    return (
        <Router>
            <Routes>
                {/* Default route now points to Appointments */}
                <Route path="/" element={<Appointments />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/appointments" element={<Appointments />} />
            </Routes>
        </Router>
    );
}

export default App;
