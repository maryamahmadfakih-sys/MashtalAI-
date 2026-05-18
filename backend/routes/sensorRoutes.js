const express = require("express");
const router = express.Router();

const { getIrrigationDecision } = require("../ai");

// TEMP data (no database yet)
router.get("/", (req, res) => {
  const sensor = {
    temperature: 32,
    humidity: 60,
    soilMoisture: 20,
    waterLevel: 70,
  };

  const decision = getIrrigationDecision(
    sensor.soilMoisture,
    sensor.temperature
  );

  res.json({
    ...sensor,
    aiDecision: decision,
  });
});

module.exports = router;