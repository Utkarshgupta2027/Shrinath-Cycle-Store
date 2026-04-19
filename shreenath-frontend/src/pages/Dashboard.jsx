import axios from "axios";
import { useEffect, useState } from "react";

function Dashboard() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const res = await axios.get("http://localhost:8080/api/activity", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setActivities(res.data);
    } catch (error) {
      console.error("Unauthorized or error fetching activity");
    }
  };

  return (
    <div>
      <h2>User Activities</h2>
      {activities.map((act, index) => (
        <div key={index}>{act.description}</div>
      ))}
    </div>
  );
}

export default Dashboard;
