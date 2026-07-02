import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default function HourlyChart({ weather, units }){
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!weather || !weather.hourly) return;
    const times = weather.hourly.time.map(t => new Date(t));
    const tempsC = weather.hourly.temperature_2m;
    // find starting index at or after now
    const now = new Date();
    let start = times.findIndex(t => t.getTime() >= now.getTime());
    if (start === -1) start = Math.max(0, times.length - 24);
    const end = Math.min(times.length, start + 24);
    const labels = times.slice(start, end).map(d => d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    let dataPoints = tempsC.slice(start, end);
    if (units === "imperial") {
      dataPoints = dataPoints.map(c => (c * 9/5) + 32);
    }
    const unitLabel = units === "imperial" ? "°F" : "°C";

    const ctx = canvasRef.current.getContext("2d");
    if (chartRef.current) {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets[0].data = dataPoints;
      chartRef.current.update();
    } else {
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: `Temperature (${unitLabel})`,
            data: dataPoints,
            borderColor: "#0b76ff",
            backgroundColor: "rgba(11,118,255,0.12)",
            tension: 0.25,
            pointRadius: 3,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: false }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
    // cleanup on unmount
    return () => {
      // don't destroy here to allow re-use; handle on new create if needed
    };
  }, [weather, units]);

  return <canvas ref={canvasRef} style={{width:"100%", height:"100%"}} />;
}